import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, ShoppingBag, Heart, Settings, LogOut, Menu, X, Store, Package, BarChart2, Users, Shield, Globe, Truck, Star, MessageSquare, FileCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { lang, dir, toggleLanguage } = useLanguage();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = {
    customer: [
      { href: '/dashboard', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, Icon: LayoutDashboard },
      { href: '/dashboard/orders', label: { en: 'My Orders', ar: 'طلباتي' }, Icon: ShoppingBag },
      { href: '/dashboard/wishlist', label: { en: 'Wishlist', ar: 'قائمة الأمنيات' }, Icon: Heart },
      { href: '/dashboard/reviews', label: { en: 'My Reviews', ar: 'مراجعاتي' }, Icon: Star },
      { href: '/profile/settings', label: { en: 'Settings', ar: 'الإعدادات' }, Icon: Settings },
    ],
    vendor: [
      { href: '/dashboard', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, Icon: LayoutDashboard },
      { href: '/vendor/onboarding', label: { en: 'Verification', ar: 'التحقق' }, Icon: FileCheck },
      { href: '/dashboard/products', label: { en: 'Products', ar: 'المنتجات' }, Icon: Package },
      { href: '/dashboard/orders', label: { en: 'Orders', ar: 'الطلبات' }, Icon: ShoppingBag },
      { href: '/dashboard/shipping', label: { en: 'Shipping', ar: 'الشحن' }, Icon: Truck },
      { href: '/dashboard/analytics', label: { en: 'Analytics', ar: 'التحليلات' }, Icon: BarChart2 },
      { href: '/dashboard/store', label: { en: 'Store Settings', ar: 'إعدادات المتجر' }, Icon: Store },
      { href: '/profile/settings', label: { en: 'Account', ar: 'الحساب' }, Icon: Settings },
    ],
    admin: [
      { href: '/dashboard', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, Icon: LayoutDashboard },
      { href: '/dashboard/users', label: { en: 'Users', ar: 'المستخدمون' }, Icon: Users },
      { href: '/dashboard/vendors', label: { en: 'Vendors', ar: 'البائعون' }, Icon: Store },
      { href: '/dashboard/legal', label: { en: 'Legal Review', ar: 'المراجعة القانونية' }, Icon: FileCheck },
      { href: '/dashboard/orders', label: { en: 'All Orders', ar: 'جميع الطلبات' }, Icon: ShoppingBag },
      { href: '/dashboard/shipping/zones', label: { en: 'Shipping Zones', ar: 'مناطق الشحن' }, Icon: Truck },
      { href: '/dashboard/analytics', label: { en: 'Analytics', ar: 'التحليلات' }, Icon: BarChart2 },
      { href: '/dashboard/moderation', label: { en: 'Products', ar: 'المنتجات' }, Icon: Shield },
      { href: '/dashboard/reviews/moderation', label: { en: 'Reviews', ar: 'المراجعات' }, Icon: MessageSquare },
      { href: '/profile/settings', label: { en: 'Settings', ar: 'الإعدادات' }, Icon: Settings },
    ],
  };

  const items = navItems[user?.role || 'customer'];

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-[#0A1628] w-64 border-r border-white/5 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0A1628]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">{lang === 'en' ? 'orbit' : 'أوربت'}</p>
            <p className="text-primary text-[9px] font-semibold tracking-widest uppercase">{lang === 'en' ? 'market' : 'ماركت'}</p>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{user?.fullName?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-white/40 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ href, label, Icon }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? 'bg-primary/15 text-primary font-semibold' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
              data-testid={`nav-${href.replace(/\//g, '-')}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label[lang]}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/5 space-y-0.5">
        <button onClick={toggleLanguage}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          data-testid="button-sidebar-lang">
          <Globe className="w-4 h-4" />
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          data-testid="button-logout">
          <LogOut className="w-4 h-4" />
          {lang === 'en' ? 'Sign out' : 'تسجيل الخروج'}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#071020] flex" dir={dir}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar />
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-white z-20">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-[#0A1628] border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button className="md:hidden text-white" onClick={() => setSidebarOpen(true)} data-testid="button-mobile-sidebar">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-white/50 text-sm hover:text-white transition-colors">
              {lang === 'en' ? '← Back to store' : 'العودة للمتجر →'}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">{user?.fullName?.charAt(0)?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
