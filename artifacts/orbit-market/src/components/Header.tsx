import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, User, Search, MapPin, ChevronDown, Menu, X, Globe, LogOut, LayoutDashboard, Settings, Package } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useCurrency, ALL_CURRENCIES, CURRENCY_META, type Currency } from '../contexts/CurrencyContext';
import { Link, useLocation } from 'wouter';
import NotificationBell from './NotificationBell';

const categoryOptions = {
  en: ['All Categories', 'Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Books', 'Automotive'],
  ar: ['كل الفئات', 'إلكترونيات', 'أزياء', 'المنزل والمعيشة', 'التجميل', 'الرياضة', 'كتب', 'السيارات'],
};

const categoryValues = ['', 'Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Books', 'Automotive'];

export default function Header() {
  const { t, lang, toggleLanguage, dir } = useLanguage();
  const { user, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { currency, setCurrency } = useCurrency();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  const cats = categoryOptions[lang];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) {
        setCurrencyMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    await logout();
    setLocation('/');
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const cat = categoryValues[selectedCategory];
    const qs = new URLSearchParams();
    if (searchQuery.trim()) qs.set('search', searchQuery.trim());
    if (cat) qs.set('category', cat);
    setLocation(`/products${qs.toString() ? `?${qs.toString()}` : ''}`);
    setIsMobileMenuOpen(false);
  }

  function handleCategoryNav(cat: string) {
    if (cat === 'deals') {
      setLocation('/products?sort=price_asc');
    } else {
      const map: Record<string, string> = {
        electronics: 'Electronics', fashion: 'Fashion', home: 'Home & Living',
        beauty: 'Beauty', sports: 'Sports', books: 'Books',
      };
      const catVal = map[cat];
      setLocation(catVal ? `/products?category=${encodeURIComponent(catVal)}` : '/products');
    }
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full" dir={dir}>
      {/* ── Top utility bar ── */}
      <div className="bg-[#050E1F] text-white/70 text-xs py-1 px-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={toggleLanguage}
            className="flex items-center gap-1 hover:text-primary transition-colors"
            data-testid="button-toggle-lang-top">
            <Globe className="w-3 h-3" />
            <span>{lang === 'en' ? 'العربية' : 'English'}</span>
          </button>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {t('common.deliverTo')} Saudi Arabia
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Currency switcher */}
          <div className="relative" ref={currencyMenuRef}>
            <button
              onClick={() => setCurrencyMenuOpen(v => !v)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
              data-testid="button-currency-switcher"
            >
              <span>{CURRENCY_META[currency].flag}</span>
              <span className="font-semibold">{currency}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {currencyMenuOpen && (
              <div className="absolute top-full mt-1 right-0 rtl:right-auto rtl:left-0 w-44 bg-[#112240] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                {ALL_CURRENCIES.map(c => {
                  const meta = CURRENCY_META[c];
                  return (
                    <button
                      key={c}
                      onClick={() => { setCurrency(c as Currency); setCurrencyMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        currency === c
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-base leading-none">{meta.flag}</span>
                      <span className="font-mono font-semibold text-xs w-8">{c}</span>
                      <span className="text-white/40 text-xs">
                        {lang === 'ar' ? meta.symbolAr : meta.symbolEn}
                      </span>
                      {currency === c && <span className="ml-auto text-primary text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Link href="/orders" className="hover:text-primary transition-colors hidden sm:block" data-testid="button-returns-top">
            {t('common.returns')}
          </Link>
          {!user && (
            <Link href="/register"
              className="bg-primary text-[#0A1628] font-semibold px-3 py-0.5 rounded text-xs hover:bg-primary/90 transition-colors"
              data-testid="button-become-vendor-top">
              {t('common.becomeVendor')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Main header row ── */}
      <div className="bg-[#0A1628] px-3 md:px-6 py-2 flex items-center gap-2 md:gap-4">
        {/* Mobile menu toggle */}
        <button className="md:hidden text-white p-1" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          data-testid="button-mobile-menu">
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0A1628]" />
          </div>
          <div className="hidden sm:block">
            <span className="text-white font-bold text-base tracking-tight leading-none block">
              {lang === 'en' ? 'orbit' : 'أوربت'}
            </span>
            <span className="text-primary text-[10px] font-semibold tracking-widest uppercase leading-none block">
              {lang === 'en' ? 'market' : 'ماركت'}
            </span>
          </div>
        </Link>

        {/* Delivery address */}
        <button className="hidden lg:flex flex-col items-start text-left rtl:items-end rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all flex-shrink-0"
          data-testid="button-delivery-location">
          <span className="text-white/60 text-[10px] leading-tight">{t('common.deliverTo')}</span>
          <span className="text-white text-xs font-bold flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            Saudi Arabia
          </span>
        </button>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex flex-1 min-w-0" data-testid="search-container">
          <div className="flex w-full rounded overflow-hidden border-2 border-primary focus-within:border-primary shadow-sm">
            <div className="hidden md:flex items-center bg-[#1D3461] border-r border-primary/40 flex-shrink-0">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(Number(e.target.value))}
                className="bg-transparent text-white/80 text-xs px-2 h-full outline-none cursor-pointer appearance-none pr-6 pl-2 rtl:pl-6 rtl:pr-2"
                style={{ backgroundImage: 'none' }} data-testid="select-category" dir={dir}>
                {cats.map((c, i) => <option key={i} value={i} className="bg-[#0A1628]">{c}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-white/60 -ml-5 pointer-events-none rtl:-mr-5 rtl:ml-0" />
            </div>
            <input
              type="search"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-white text-[#0A1628] placeholder-gray-400 px-4 py-2.5 text-sm outline-none min-w-0"
              dir={dir} data-testid="input-search"
            />
            <button type="submit" className="bg-primary hover:bg-primary/90 text-[#0A1628] px-4 flex items-center justify-center flex-shrink-0 transition-colors"
              data-testid="button-search">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          {/* Language toggle (desktop) */}
          <button onClick={toggleLanguage}
            className="hidden md:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-toggle-lang">
            <span className="text-white/60 text-[10px] leading-tight">{lang === 'en' ? 'اللغة' : 'Language'}</span>
            <span className="text-white text-xs font-bold">{lang === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Account — logged out */}
          {!user && (
            <Link href="/login"
              className="hidden md:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
              data-testid="button-account">
              <span className="text-white/60 text-[10px] leading-tight">
                {lang === 'en' ? 'Hello, Sign in' : 'مرحباً، سجل الدخول'}
              </span>
              <span className="text-white text-xs font-bold flex items-center gap-1">
                {t('common.account')}
                <ChevronDown className="w-3 h-3" />
              </span>
            </Link>
          )}

          {/* Account — logged in */}
          {user && (
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
                data-testid="button-user-menu">
                <span className="text-white/60 text-[10px] leading-tight">
                  {lang === 'en' ? 'Hello,' : 'مرحباً،'} {user.fullName.split(' ')[0]}
                </span>
                <span className="text-white text-xs font-bold flex items-center gap-1">
                  {t('common.account')}
                  <ChevronDown className="w-3 h-3" />
                </span>
              </button>
              {userMenuOpen && (
                <div className="absolute top-full mt-1 right-0 rtl:right-auto rtl:left-0 w-52 bg-[#112240] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-white font-semibold text-sm truncate">{user.fullName}</p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full capitalize">
                      {user.role}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors"
                      data-testid="button-go-dashboard" onClick={() => setUserMenuOpen(false)}>
                      <LayoutDashboard className="w-4 h-4" />
                      {lang === 'en' ? 'Dashboard' : 'لوحة التحكم'}
                    </Link>
                    <Link href="/orders"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors"
                      onClick={() => setUserMenuOpen(false)}>
                      <Package className="w-4 h-4" />
                      {lang === 'en' ? 'My Orders' : 'طلباتي'}
                    </Link>
                    <Link href="/profile/settings"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors"
                      data-testid="button-go-settings" onClick={() => setUserMenuOpen(false)}>
                      <Settings className="w-4 h-4" />
                      {lang === 'en' ? 'Settings' : 'الإعدادات'}
                    </Link>
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-sm transition-colors"
                      data-testid="button-logout-header">
                      <LogOut className="w-4 h-4" />
                      {lang === 'en' ? 'Sign out' : 'تسجيل الخروج'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Returns & Orders */}
          <Link href="/orders"
            className="hidden lg:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-returns">
            <span className="text-white/60 text-[10px] leading-tight">{lang === 'en' ? 'Returns' : 'المرتجعات'}</span>
            <span className="text-white text-xs font-bold">{lang === 'en' ? '& Orders' : 'والطلبات'}</span>
          </Link>

          {/* Notification Bell (only when logged in) */}
          {user && <NotificationBell />}

          {/* Cart */}
          <Link href="/cart" className="flex items-end gap-1 hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-cart">
            <div className="relative">
              <ShoppingCart className="w-7 h-7 text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 left-3 rtl:left-auto rtl:right-3 bg-primary text-[#0A1628] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className="text-white text-xs font-bold hidden sm:block">{t('common.cart')}</span>
          </Link>

          {/* Mobile user icon */}
          {user ? (
            <Link href="/dashboard" className="md:hidden">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-primary font-bold text-xs">{user.fullName.charAt(0).toUpperCase()}</span>
              </div>
            </Link>
          ) : (
            <Link href="/login" className="md:hidden text-white" data-testid="button-account-mobile">
              <User className="w-6 h-6" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Category nav bar ── */}
      <div className="bg-[#112240] border-b border-white/5 overflow-x-auto hidden md:block">
        <div className="flex items-center px-4 h-9 gap-1 w-max">
          <button
            onClick={() => setLocation('/products')}
            className="flex items-center gap-1.5 px-3 h-full text-white text-xs font-semibold hover:bg-white/10 rounded transition-colors whitespace-nowrap"
            data-testid="nav-all">
            <Menu className="w-4 h-4" />
            {t('nav.all')}
          </button>
          {(['deals', 'electronics', 'fashion', 'home', 'beauty', 'sports', 'books'] as const).map((key) => (
            <button key={key}
              onClick={() => handleCategoryNav(key)}
              className="px-3 h-full text-white/80 text-xs hover:bg-white/10 hover:text-primary rounded transition-colors whitespace-nowrap"
              data-testid={`nav-${key}`}>
              {t(`nav.${key}`)}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          {user ? (
            <Link href="/dashboard"
              className="px-3 h-full text-primary text-xs font-semibold hover:bg-white/10 rounded transition-colors whitespace-nowrap flex items-center">
              {lang === 'en' ? 'My Dashboard' : 'لوحتي'}
            </Link>
          ) : (
            <Link href="/register"
              className="px-3 h-full text-primary text-xs font-semibold hover:bg-white/10 rounded transition-colors whitespace-nowrap flex items-center"
              data-testid="nav-become-vendor">
              {t('common.becomeVendor')}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0A1628] border-t border-white/10 p-4 flex flex-col gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white text-[#0A1628] placeholder-gray-400 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 text-sm outline-none rounded"
              dir={dir}
            />
          </form>
          <div className="flex flex-wrap gap-2">
            {(['deals', 'electronics', 'fashion', 'home', 'beauty'] as const).map((key) => (
              <button key={key} onClick={() => handleCategoryNav(key)}
                className="px-3 py-1 bg-[#112240] text-white/80 text-xs rounded border border-white/10 hover:border-[#D4AF37]/40 hover:text-white transition-colors">
                {t(`nav.${key}`)}
              </button>
            ))}
          </div>

          {/* Mobile currency switcher */}
          <div>
            <p className="text-white/40 text-xs mb-1.5">{lang === 'ar' ? 'العملة' : 'Currency'}</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_CURRENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c as Currency)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    currency === c
                      ? 'bg-primary/15 border-primary/40 text-primary font-semibold'
                      : 'bg-[#112240] border-white/10 text-white/70 hover:border-white/30'
                  }`}
                >
                  <span>{CURRENCY_META[c].flag}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </div>
          {user ? (
            <div className="flex gap-2">
              <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 bg-white/5 text-white font-semibold py-2 rounded text-sm text-center border border-white/10">
                {lang === 'en' ? 'My Orders' : 'طلباتي'}
              </Link>
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 bg-primary/15 text-primary font-semibold py-2 rounded text-sm text-center">
                {lang === 'en' ? 'Dashboard' : 'لوحة التحكم'}
              </Link>
              <button onClick={handleLogout} className="flex-1 border border-red-500/30 text-red-400 py-2 rounded text-sm">
                {lang === 'en' ? 'Sign out' : 'خروج'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="flex-1 border border-white/20 text-white font-semibold py-2 rounded text-sm text-center">
                {lang === 'en' ? 'Sign in' : 'دخول'}
              </Link>
              <Link href="/register" className="flex-1 bg-primary text-[#0A1628] font-semibold py-2 rounded text-sm text-center"
                data-testid="button-become-vendor-mobile">
                {t('common.becomeVendor')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
