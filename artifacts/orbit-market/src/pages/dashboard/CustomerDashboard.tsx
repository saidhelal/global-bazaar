import { Link } from 'wouter';
import { ShoppingBag, Heart, MapPin, Star, Package, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from './DashboardLayout';

const mockOrders = [
  { id: 'ORB-1042', product: 'Pro Max Headphones', date: '2024-05-20', status: 'delivered', price: 373 },
  { id: 'ORB-1041', product: 'Artisan Coffee Set', date: '2024-05-15', status: 'shipped', price: 66 },
  { id: 'ORB-1039', product: 'Leather Weekender Bag', date: '2024-05-08', status: 'processing', price: 248 },
];

const statusColors: Record<string, string> = {
  delivered: 'bg-green-500/15 text-green-400',
  shipped: 'bg-blue-500/15 text-blue-400',
  processing: 'bg-yellow-500/15 text-yellow-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();

  const tx = {
    en: {
      welcome: 'Welcome back', greeting: 'Ready to discover something new?',
      totalOrders: 'Total Orders', wishlist: 'Wishlist Items', reviews: 'Reviews Given',
      totalSpent: 'Total Spent', recentOrders: 'Recent Orders',
      viewAll: 'View all', orderStatus: 'Status', orderDate: 'Date',
      delivered: 'Delivered', shipped: 'Shipped', processing: 'Processing', cancelled: 'Cancelled',
      shopNow: 'Shop Now', viewProfile: 'View Profile',
    },
    ar: {
      welcome: 'مرحباً بعودتك', greeting: 'هل أنت مستعد لاكتشاف شيء جديد؟',
      totalOrders: 'إجمالي الطلبات', wishlist: 'قائمة الأمنيات', reviews: 'التقييمات المقدمة',
      totalSpent: 'إجمالي الإنفاق', recentOrders: 'الطلبات الأخيرة',
      viewAll: 'عرض الكل', orderStatus: 'الحالة', orderDate: 'التاريخ',
      delivered: 'تم التوصيل', shipped: 'تم الشحن', processing: 'قيد المعالجة', cancelled: 'ملغى',
      shopNow: 'تسوق الآن', viewProfile: 'عرض الملف الشخصي',
    },
  }[lang];

  const statusLabel = (s: string) => tx[s as 'delivered'] || s;

  const stats = [
    { label: tx.totalOrders, value: '12', Icon: ShoppingBag },
    { label: tx.wishlist, value: '8', Icon: Heart },
    { label: tx.reviews, value: '5', Icon: Star },
    { label: tx.totalSpent, value: '$1,240', Icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-[#112240] to-[#1D3461] rounded-lg p-6 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-primary text-sm font-medium">{tx.welcome},</p>
            <h2 className="text-xl font-bold text-white mt-0.5">{user?.fullName}</h2>
            <p className="text-white/50 text-sm mt-1">{tx.greeting}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="bg-primary text-[#0A1628] font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
              data-testid="button-shop-now">{tx.shopNow}</Link>
            <Link href="/profile/settings" className="border border-white/20 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
              data-testid="button-view-profile">{tx.viewProfile}</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, Icon }) => (
            <div key={label} className="bg-[#112240] rounded-lg p-5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/50 text-xs">{label}</p>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="bg-[#112240] rounded-lg border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold">{tx.recentOrders}</h3>
            <button className="text-primary text-sm hover:underline">{tx.viewAll}</button>
          </div>
          <div className="divide-y divide-white/5">
            {mockOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{order.product}</p>
                    <p className="text-white/40 text-xs">{order.id} · {order.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[order.status]}`}>
                    {statusLabel(order.status)}
                  </span>
                  <span className="text-white font-semibold text-sm">${order.price}</span>
                  <ChevronRight className="w-4 h-4 text-white/30 rtl:rotate-180" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: lang === 'en' ? 'My Addresses' : 'عناويني', Icon: MapPin, href: '/profile/settings' },
            { label: lang === 'en' ? 'Wishlist' : 'قائمة الأمنيات', Icon: Heart, href: '/' },
            { label: lang === 'en' ? 'Track Orders' : 'تتبع الطلبات', Icon: Package, href: '/' },
          ].map(({ label, Icon, href }) => (
            <Link key={label} href={href}
              className="bg-[#112240] rounded-lg p-4 border border-white/5 hover:border-primary/30 flex items-center gap-3 group transition-all">
              <div className="w-10 h-10 rounded-lg bg-[#0A1628] flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white text-sm font-medium">{label}</span>
              <ChevronRight className="w-4 h-4 text-white/30 ml-auto rtl:ml-0 rtl:mr-auto rtl:rotate-180" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
