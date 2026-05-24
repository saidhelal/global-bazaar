import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink, Package, Truck, ShoppingBag, Star, Shield, Info } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useNotifications, type AppNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

const TYPE_ICON: Record<string, React.ReactNode> = {
  order_created:    <ShoppingBag className="w-4 h-4" />,
  order_status:     <ShoppingBag className="w-4 h-4" />,
  shipment_created: <Truck className="w-4 h-4" />,
  shipment_update:  <Truck className="w-4 h-4" />,
  vendor_approved:  <Star className="w-4 h-4" />,
  product_approved: <Check className="w-4 h-4" />,
  product_rejected: <X className="w-4 h-4" />,
  new_vendor:       <Star className="w-4 h-4" />,
  new_order:        <ShoppingBag className="w-4 h-4" />,
  payment_received: <Shield className="w-4 h-4" />,
  system:           <Info className="w-4 h-4" />,
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

function timeAgo(dateStr: string, lang: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (lang === 'ar') {
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
    return `${Math.floor(diff / 86400)} ي`;
  }
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const tx = {
    en: { title: 'Notifications', markAll: 'Mark all read', viewAll: 'View all', empty: 'No notifications', emptyHint: "You're all caught up!" },
    ar: { title: 'الإشعارات', markAll: 'تعليم الكل كمقروء', viewAll: 'عرض الكل', empty: 'لا توجد إشعارات', emptyHint: 'ليس لديك إشعارات جديدة!' },
  }[lang];

  function handleNotifClick(n: AppNotification) {
    if (!n.isRead) markRead(n.id);
    if (n.link) {
      setLocation(n.link);
      setOpen(false);
    }
  }

  const preview = notifications.slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
        data-testid="button-notification-bell"
      >
        <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 rtl:-right-auto rtl:-left-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full mt-2 right-0 rtl:right-auto rtl:left-0 w-80 bg-[#112240] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-sm">{tx.title}</h3>
              {unreadCount > 0 && (
                <span className="bg-primary/20 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tx.markAll}</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[380px] overflow-y-auto">
            {preview.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell className="w-10 h-10 text-white/10 mx-auto mb-2" />
                <p className="text-white/50 text-sm font-medium">{tx.empty}</p>
                <p className="text-white/25 text-xs mt-0.5">{tx.emptyHint}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {preview.map(n => {
                  const icon = TYPE_ICON[n.type] || <Info className="w-4 h-4" />;
                  const color = TYPE_COLOR[n.type] || 'text-white/50 bg-white/5';
                  const title = lang === 'ar' ? n.titleAr : n.title;
                  const message = lang === 'ar' ? n.messageAr : n.message;
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 cursor-pointer group transition-colors ${n.isRead ? 'hover:bg-white/3' : 'bg-primary/3 hover:bg-primary/5'}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-semibold leading-snug truncate ${n.isRead ? 'text-white/70' : 'text-white'}`}>{title}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-white/25">{timeAgo(n.createdAt, lang)}</span>
                            {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                          </div>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2 leading-relaxed">{message}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all flex-shrink-0 self-start mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-white/5 px-4 py-2.5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {tx.viewAll}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
