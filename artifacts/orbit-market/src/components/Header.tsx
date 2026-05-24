import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, User, Search, MapPin, ChevronDown, ChevronRight, Menu, X, Globe, LogOut, LayoutDashboard, Settings, Package, AlignJustify } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useCurrency, ALL_CURRENCIES, CURRENCY_META, type Currency } from '../contexts/CurrencyContext';
import { Link, useLocation } from 'wouter';
import NotificationBell from './NotificationBell';
import { CATEGORIES } from '../data/categories';

export default function Header() {
  const { t, lang, toggleLanguage, dir } = useLanguage();
  const { user, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { currency, setCurrency } = useCurrency();
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchCat, setSearchCat] = useState('');

  // Desktop mega menu
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaHovered, setMegaHovered] = useState(CATEGORIES[0].value);
  const megaRef = useRef<HTMLDivElement>(null);
  const megaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  // User menu + currency
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) setCurrencyMenuOpen(false);
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMegaOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() { await logout(); setLocation('/'); }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (searchQuery.trim()) qs.set('search', searchQuery.trim());
    if (searchCat) qs.set('category', searchCat);
    setLocation(`/products${qs.toString() ? `?${qs.toString()}` : ''}`);
    setMobileOpen(false);
  }

  function navTo(cat: string, sub?: string) {
    const qs = new URLSearchParams();
    if (sub) { qs.set('category', sub); } else { qs.set('category', cat); }
    setLocation(`/products?${qs.toString()}`);
    setMegaOpen(false);
    setMobileOpen(false);
  }

  function openMega() {
    if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
    setMegaOpen(true);
  }
  function scheduleMegaClose() {
    megaTimerRef.current = setTimeout(() => setMegaOpen(false), 150);
  }

  const hoveredCat = CATEGORIES.find(c => c.value === megaHovered) || CATEGORIES[0];

  // Top 8 categories for the desktop nav bar
  const navBarCats = CATEGORIES.slice(0, 8);

  return (
    <header className="sticky top-0 z-50 w-full shadow-lg" dir={dir}>

      {/* ── Top utility bar ── */}
      <div className="bg-[#050E1F] text-white/70 text-xs py-1 px-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={toggleLanguage}
            className="flex items-center gap-1 hover:text-primary transition-colors"
            data-testid="button-toggle-lang-top">
            <Globe className="w-3 h-3" />
            <span>{lang === 'en' ? 'العربية' : 'English'}</span>
          </button>
          <span className="hidden sm:flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {t('common.deliverTo')} Saudi Arabia
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative" ref={currencyMenuRef}>
            <button onClick={() => setCurrencyMenuOpen(v => !v)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
              data-testid="button-currency-switcher">
              <span>{CURRENCY_META[currency].flag}</span>
              <span className="font-semibold">{currency}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {currencyMenuOpen && (
              <div className="absolute top-full mt-1 right-0 rtl:right-auto rtl:left-0 w-44 bg-[#112240] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                {ALL_CURRENCIES.map(c => {
                  const meta = CURRENCY_META[c];
                  return (
                    <button key={c} onClick={() => { setCurrency(c as Currency); setCurrencyMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${currency === c ? 'bg-primary/15 text-primary font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                      <span className="text-base leading-none">{meta.flag}</span>
                      <span className="font-mono font-semibold text-xs w-8">{c}</span>
                      <span className="text-white/40 text-xs">{lang === 'ar' ? meta.symbolAr : meta.symbolEn}</span>
                      {currency === c && <span className="ml-auto rtl:mr-auto rtl:ml-0 text-primary text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
        {/* Mobile hamburger */}
        <button className="md:hidden text-white p-1" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0A1628]" />
          </div>
          <div className="hidden sm:block">
            <span className="text-white font-bold text-base tracking-tight leading-none block">{lang === 'en' ? 'orbit' : 'أوربت'}</span>
            <span className="text-primary text-[10px] font-semibold tracking-widest uppercase leading-none block">{lang === 'en' ? 'market' : 'ماركت'}</span>
          </div>
        </Link>

        {/* Delivery */}
        <button className="hidden lg:flex flex-col items-start text-left rtl:items-end rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all flex-shrink-0"
          data-testid="button-delivery-location">
          <span className="text-white/60 text-[10px] leading-tight">{t('common.deliverTo')}</span>
          <span className="text-white text-xs font-bold flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />Saudi Arabia</span>
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-1 min-w-0" data-testid="search-container">
          <div className="flex w-full rounded overflow-hidden border-2 border-primary focus-within:border-primary/80 shadow-sm">
            <div className="hidden md:flex items-center bg-[#1D3461] border-r border-primary/40 flex-shrink-0">
              <select value={searchCat} onChange={e => setSearchCat(e.target.value)}
                className="bg-transparent text-white/80 text-xs px-2 h-full outline-none cursor-pointer appearance-none pr-6 pl-2 rtl:pl-6 rtl:pr-2 max-w-[130px]"
                style={{ backgroundImage: 'none' }} data-testid="select-category" dir={dir}>
                <option value="" className="bg-[#0A1628]">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value} className="bg-[#0A1628]">
                    {lang === 'ar' ? c.ar : c.en}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-white/60 -ml-5 pointer-events-none rtl:-mr-5 rtl:ml-0" />
            </div>
            <input type="search" placeholder={t('common.search')} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-white text-[#0A1628] placeholder-gray-400 px-4 py-2.5 text-sm outline-none min-w-0"
              dir={dir} data-testid="input-search" />
            <button type="submit"
              className="bg-primary hover:bg-primary/90 text-[#0A1628] px-4 flex items-center justify-center flex-shrink-0 transition-colors"
              data-testid="button-search">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          <button onClick={toggleLanguage}
            className="hidden md:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-toggle-lang">
            <span className="text-white/60 text-[10px] leading-tight">{lang === 'en' ? 'اللغة' : 'Language'}</span>
            <span className="text-white text-xs font-bold">{lang === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {!user && (
            <Link href="/login"
              className="hidden md:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
              data-testid="button-account">
              <span className="text-white/60 text-[10px] leading-tight">{lang === 'en' ? 'Hello, Sign in' : 'مرحباً، سجل الدخول'}</span>
              <span className="text-white text-xs font-bold flex items-center gap-1">{t('common.account')} <ChevronDown className="w-3 h-3" /></span>
            </Link>
          )}

          {user && (
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
                data-testid="button-user-menu">
                <span className="text-white/60 text-[10px] leading-tight">{lang === 'en' ? 'Hello,' : 'مرحباً,'} {user.fullName.split(' ')[0]}</span>
                <span className="text-white text-xs font-bold flex items-center gap-1">{t('common.account')} <ChevronDown className="w-3 h-3" /></span>
              </button>
              {userMenuOpen && (
                <div className="absolute top-full mt-1 right-0 rtl:right-auto rtl:left-0 w-52 bg-[#112240] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-white font-semibold text-sm truncate">{user.fullName}</p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full capitalize">{user.role}</span>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors" data-testid="button-go-dashboard" onClick={() => setUserMenuOpen(false)}>
                      <LayoutDashboard className="w-4 h-4" />{lang === 'en' ? 'Dashboard' : 'لوحة التحكم'}
                    </Link>
                    <Link href="/orders" className="flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors" onClick={() => setUserMenuOpen(false)}>
                      <Package className="w-4 h-4" />{lang === 'en' ? 'My Orders' : 'طلباتي'}
                    </Link>
                    <Link href="/profile/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors" data-testid="button-go-settings" onClick={() => setUserMenuOpen(false)}>
                      <Settings className="w-4 h-4" />{lang === 'en' ? 'Settings' : 'الإعدادات'}
                    </Link>
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-sm transition-colors" data-testid="button-logout-header">
                      <LogOut className="w-4 h-4" />{lang === 'en' ? 'Sign out' : 'تسجيل الخروج'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Link href="/orders"
            className="hidden lg:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-returns">
            <span className="text-white/60 text-[10px] leading-tight">{lang === 'en' ? 'Returns' : 'المرتجعات'}</span>
            <span className="text-white text-xs font-bold">{lang === 'en' ? '& Orders' : 'والطلبات'}</span>
          </Link>

          {user && <NotificationBell />}

          <Link href="/cart" className="flex items-end gap-1 hover:border hover:border-white/30 rounded p-1 transition-all" data-testid="button-cart">
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

          {user ? (
            <Link href="/dashboard" className="md:hidden">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-primary font-bold text-xs">{user.fullName.charAt(0).toUpperCase()}</span>
              </div>
            </Link>
          ) : (
            <Link href="/login" className="md:hidden text-white" data-testid="button-account-mobile"><User className="w-6 h-6" /></Link>
          )}
        </div>
      </div>

      {/* ── Desktop category nav bar + Mega Menu ── */}
      <div className="bg-[#0D1F3C] border-b border-white/5 hidden md:block">
        <div className="flex items-center px-4 h-10 gap-0.5 overflow-x-auto">

          {/* All Categories — triggers mega menu */}
          <div className="relative flex-shrink-0" ref={megaRef}
            onMouseEnter={openMega} onMouseLeave={scheduleMegaClose}>
            <button
              onClick={() => setMegaOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 h-10 text-white text-xs font-bold hover:bg-white/10 transition-colors whitespace-nowrap bg-white/5 border-r border-white/5"
              data-testid="nav-all-categories">
              <AlignJustify className="w-4 h-4" />
              {lang === 'ar' ? 'كل الأقسام' : 'All Departments'}
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Mega menu panel */}
            {megaOpen && (
              <div
                className="absolute top-full left-0 rtl:left-auto rtl:right-0 z-50 flex shadow-2xl border border-white/10 rounded-b-xl overflow-hidden"
                style={{ minWidth: 560 }}
                onMouseEnter={openMega} onMouseLeave={scheduleMegaClose}>

                {/* Left: main categories */}
                <div className="bg-[#0A1628] w-52 py-2 border-r border-white/5 flex-shrink-0">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onMouseEnter={() => setMegaHovered(cat.value)}
                      onClick={() => navTo(cat.value)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors text-left rtl:text-right ${megaHovered === cat.value ? 'bg-primary/10 text-primary' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span className="font-medium">{lang === 'ar' ? cat.ar : cat.en}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 rtl:rotate-180 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Right: subcategories + banner */}
                <div className="bg-[#112240] flex-1 p-4">
                  <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">
                    {lang === 'ar' ? hoveredCat.ar : hoveredCat.en}
                  </p>
                  <div className="grid grid-cols-2 gap-1 mb-4">
                    {hoveredCat.subcategories.map(sub => (
                      <button
                        key={sub.value}
                        onClick={() => navTo(hoveredCat.value, sub.value)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left rtl:text-right">
                        <ChevronRight className="w-3 h-3 text-primary/50 rtl:rotate-180 flex-shrink-0" />
                        {lang === 'ar' ? sub.ar : sub.en}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => navTo(hoveredCat.value)}
                    className="text-xs text-primary hover:underline font-semibold">
                    {lang === 'ar' ? `عرض كل ${hoveredCat.ar}` : `See all in ${hoveredCat.en} →`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick-access category nav pills */}
          {navBarCats.map(cat => (
            <button key={cat.value}
              onClick={() => navTo(cat.value)}
              className="px-3 h-10 text-white/75 text-xs hover:bg-white/10 hover:text-white rounded transition-colors whitespace-nowrap flex-shrink-0">
              {lang === 'ar' ? cat.ar : cat.en}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />
          {user ? (
            <Link href="/dashboard"
              className="px-3 h-10 text-primary text-xs font-semibold hover:bg-white/10 rounded transition-colors whitespace-nowrap flex items-center flex-shrink-0">
              {lang === 'en' ? 'My Dashboard' : 'لوحتي'}
            </Link>
          ) : (
            <Link href="/register"
              className="px-3 h-10 text-primary text-xs font-semibold hover:bg-white/10 rounded transition-colors whitespace-nowrap flex items-center flex-shrink-0"
              data-testid="nav-become-vendor">
              {t('common.becomeVendor')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Mobile menu drawer ── */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0A1628] border-t border-white/10 flex flex-col">
          {/* Mobile search */}
          <div className="p-3 border-b border-white/5">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="search" placeholder={t('common.search')} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white text-[#0A1628] placeholder-gray-400 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 text-sm outline-none rounded"
                dir={dir} />
            </form>
          </div>

          {/* Mobile categories accordion */}
          <div className="overflow-y-auto max-h-[60vh]">
            <p className="px-4 pt-3 pb-1 text-white/30 text-[10px] uppercase tracking-widest font-semibold">
              {lang === 'ar' ? 'الأقسام' : 'Departments'}
            </p>
            {CATEGORIES.map(cat => (
              <div key={cat.value} className="border-b border-white/5 last:border-0">
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === cat.value ? null : cat.value)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors text-left rtl:text-right">
                  <span className="flex items-center gap-2">
                    <span>{cat.emoji}</span>
                    <span>{lang === 'ar' ? cat.ar : cat.en}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${mobileExpanded === cat.value ? 'rotate-180' : ''}`} />
                </button>

                {mobileExpanded === cat.value && (
                  <div className="bg-[#071020] px-4 pb-2 space-y-0.5">
                    <button
                      onClick={() => navTo(cat.value)}
                      className="w-full text-left rtl:text-right py-2 px-2 text-primary text-sm font-semibold">
                      {lang === 'ar' ? `كل ${cat.ar}` : `All ${cat.en}`}
                    </button>
                    {cat.subcategories.map(sub => (
                      <button
                        key={sub.value}
                        onClick={() => navTo(cat.value, sub.value)}
                        className="w-full flex items-center gap-2 text-left rtl:text-right py-2 px-2 text-sm text-white/60 hover:text-white transition-colors">
                        <ChevronRight className="w-3 h-3 text-white/20 rtl:rotate-180 flex-shrink-0" />
                        {lang === 'ar' ? sub.ar : sub.en}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile currency */}
          <div className="p-3 border-t border-white/5">
            <p className="text-white/40 text-xs mb-2">{lang === 'ar' ? 'العملة' : 'Currency'}</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_CURRENCIES.map(c => (
                <button key={c} onClick={() => setCurrency(c as Currency)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors ${currency === c ? 'bg-primary/15 border-primary/40 text-primary font-semibold' : 'bg-[#112240] border-white/10 text-white/70 hover:border-white/30'}`}>
                  <span>{CURRENCY_META[c].flag}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile auth buttons */}
          <div className="p-3 border-t border-white/5">
            {user ? (
              <div className="flex gap-2">
                <Link href="/orders" onClick={() => setMobileOpen(false)}
                  className="flex-1 bg-white/5 text-white font-semibold py-2 rounded text-sm text-center border border-white/10">
                  {lang === 'en' ? 'My Orders' : 'طلباتي'}
                </Link>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}
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
        </div>
      )}
    </header>
  );
}
