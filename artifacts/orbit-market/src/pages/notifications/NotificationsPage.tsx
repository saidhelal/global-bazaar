import { useState } from 'react';
import { Bell, CheckCheck, Trash2, X, ShoppingBag, Truck, Star, Check, Shield, Info, Filter } from 'lucide-react';
import { useLocation } from 'wouter';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useNotifications, type AppNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_ICON: Record<string, React.ReactNode> = {
  order_created:    <ShoppingBag className="w-5 h-5" />,
  order_status:     <ShoppingBag className="w-5 h-5" />,
  shipment_created: <Truck className="w-5 h-5" />,
  shipment_update:  <Truck className="w-5 h-5" />,
  vendor_approved:  <Star className="w-5 h-5" />,
  product_approved: <Check className="w-5 h-5" />,
  product_rejected: <X className="w-5 h-5" />,
  new_vendor:       <Star className="w-5 h-5" />,
  new_order:        <ShoppingBag className="w-5 h-5" />,
  payment_received: <Shield className="w-5 h-5" />,
  system:           <Info className="w-5 h-5" />,
};

const TYPE_COLOR: Record<string, string> = {
  order_created:    'text-blue-400 bg-blue-500/15',
  order_status:     'text-cyan-400 bg-cyan-500/15',
  shipment_created: 'text-primary bg-primary/15',
  shipment_update:  'text-yellow-400 bg-yellow-500/15',
  vendor_approved:  'text-green-400 bg-green-500/15',
  product_approved: 'text-green-400 bg-green-500/15',
  product_rejected: 'text-red-400 bg-red-500/15',
  new_vendor:       'text-purple-400 bg-purple-500/15',
  new_order:        'text-blue-400 bg-blue-500/15',
  payment_received: 'text-green-400 bg-green-500/15',
  system:           'text-white/50 bg-white/5',
};

type FilterTab = 'all' | 'unread' | 'orders' | 'shipping' | 'account';

const FILTER_TYPES: Record<FilterTab, string[]> = {
  all: [],
  unread: [],
  orders: ['order_created', 'order_status', 'new_order', 'payment_received'],
  shipping: ['shipment_created', 'shipment_update'],
  account: ['vendor_approved', 'product_approved', 'product_rejected', 'new_vendor', 'system'],
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, clearAll, loading } = useNotifications();
  const { lang, dir } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const tx = {
    en: {
      title: 'Notifications', subtitle: 'Stay updated on your orders, shipments, and account',
      all: 'All', unread: 'Unread', orders: 'Orders', shipping: 'Shipping', account: 'Account',
      markAllRead: 'Mark all read', clearAll: 'Clear all', empty: 'No notifications here',
      emptyHint: "You're all caught up!", unreadBadge: 'unread',
      signInRequired: 'Sign in to view your notifications',
      signIn: 'Sign In', ago: 'ago',
    },
    ar: {
      title: 'الإشعارات', subtitle: 'تابع طلباتك وشحناتك وحسابك',
      all: 'الكل', unread: 'غير مقروء', orders: 'الطلبات', shipping: 'الشحن', account: 'الحساب',
      markAllRead: 'تعليم الكل كمقروء', clearAll: 'مسح الكل', empty: 'لا توجد إشعارات هنا',
      emptyHint: 'أنت على اطلاع بكل شيء!', unreadBadge: 'غير مقروء',
      signInRequired: 'سجل الدخول لعرض إشعاراتك',
      signIn: 'تسجيل الدخول', ago: 'منذ',
    },
  }[lang];

  function filteredNotifications(): AppNotification[] {
    let list = [...notifications];
    if (activeTab === 'unread') return list.filter(n => !n.isRead);
    const types = FILTER_TYPES[activeTab];
    if (types.length > 0) return list.filter(n => types.includes(n.type));
    return list;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (lang === 'ar') {
      if (diff < 60) return 'الآن';
      if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
      if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
      if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    } else {
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    }
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  }

  const displayed = filteredNotifications();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Bell className="w-16 h-16 text-white/10" />
          <p className="text-white/60 text-base">{tx.signInRequired}</p>
          <button onClick={() => setLocation('/login')} className="bg-primary text-[#0A1628] font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors">
            {tx.signIn}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: tx.all },
    { key: 'unread', label: tx.unread },
    { key: 'orders', label: tx.orders },
    { key: 'shipping', label: tx.shipping },
    { key: 'account', label: tx.account },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">{tx.title}</h1>
            <p className="text-white/40 text-sm mt-1">{tx.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-3 py-2 rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {tx.markAllRead}
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => { if (confirm(lang === 'ar' ? 'هل تريد مسح جميع الإشعارات؟' : 'Clear all notifications?')) clearAll(); }}
                className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/15 text-red-400 px-3 py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {tx.clearAll}
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-[#0A1628]'
                  : 'bg-[#112240] text-white/50 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className={`ml-1.5 rtl:ml-0 rtl:mr-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'unread' ? 'bg-[#0A1628]/30' : 'bg-primary/20 text-primary'}`}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-[#112240] rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-14 h-14 text-white/10 mx-auto mb-3" />
            <p className="text-white/50 font-medium">{tx.empty}</p>
            <p className="text-white/25 text-sm mt-1">{tx.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(n => {
              const icon = TYPE_ICON[n.type] || <Info className="w-5 h-5" />;
              const color = TYPE_COLOR[n.type] || 'text-white/50 bg-white/5';
              const title = lang === 'ar' ? n.titleAr : n.title;
              const message = lang === 'ar' ? n.messageAr : n.message;
              return (
                <div
                  key={n.id}
                  className={`bg-[#112240] border rounded-2xl p-4 flex gap-4 group cursor-pointer transition-all ${
                    n.isRead ? 'border-white/5 hover:border-white/10' : 'border-primary/20 hover:border-primary/30'
                  }`}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                    if (n.link) setLocation(n.link);
                  }}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${n.isRead ? 'text-white/70' : 'text-white'}`}>{title}</p>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-white/50 text-sm mt-0.5 leading-relaxed">{message}</p>
                        <p className="text-white/25 text-xs mt-1.5">{formatDate(n.createdAt)}</p>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={e => { e.stopPropagation(); markRead(n.id); }}
                            className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-primary transition-all p-1 rounded"
                            title={lang === 'ar' ? 'تعليم كمقروء' : 'Mark as read'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-1 rounded"
                          title={lang === 'ar' ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
