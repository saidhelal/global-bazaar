import { useState } from 'react';
import { ShoppingCart, User, Search, MapPin, ChevronDown, Menu, X, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'wouter';

const categoryOptions = {
  en: ['All Categories', 'Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Books', 'Automotive'],
  ar: ['كل الفئات', 'إلكترونيات', 'أزياء', 'المنزل والمعيشة', 'التجميل', 'الرياضة', 'كتب', 'السيارات'],
};

export default function Header() {
  const { t, lang, toggleLanguage, dir } = useLanguage();
  const [cartCount] = useState(3);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);

  const cats = categoryOptions[lang];

  return (
    <header className="sticky top-0 z-50 w-full" dir={dir}>
      {/* ── Top utility bar ── */}
      <div className="bg-[#050E1F] text-white/70 text-xs py-1 px-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 hover:text-primary transition-colors"
            data-testid="button-toggle-lang-top"
          >
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
          <button className="hover:text-primary transition-colors" data-testid="button-returns-top">
            {t('common.returns')}
          </button>
          <button
            className="bg-primary text-[#0A1628] font-semibold px-3 py-0.5 rounded text-xs hover:bg-primary/90 transition-colors"
            data-testid="button-become-vendor-top"
          >
            {t('common.becomeVendor')}
          </button>
        </div>
      </div>

      {/* ── Main header row ── */}
      <div className="bg-[#0A1628] px-3 md:px-6 py-2 flex items-center gap-2 md:gap-4">
        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          data-testid="button-mobile-menu"
        >
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
        <div className="flex flex-1 min-w-0" data-testid="search-container">
          <div className="flex w-full rounded overflow-hidden border-2 border-primary focus-within:border-primary shadow-sm">
            {/* Category dropdown */}
            <div className="hidden md:flex items-center bg-[#1D3461] border-r border-primary/40 flex-shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(Number(e.target.value))}
                className="bg-transparent text-white/80 text-xs px-2 py-0 h-full outline-none cursor-pointer appearance-none pr-6 pl-2 rtl:pl-6 rtl:pr-2"
                style={{ backgroundImage: 'none' }}
                data-testid="select-category"
                dir={dir}
              >
                {cats.map((c, i) => (
                  <option key={i} value={i} className="bg-[#0A1628]">{c}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-white/60 -ml-5 pointer-events-none rtl:-mr-5 rtl:ml-0" />
            </div>

            {/* Input */}
            <input
              type="search"
              placeholder={t('common.search')}
              className="flex-1 bg-white text-[#0A1628] placeholder-gray-400 px-4 py-2.5 text-sm outline-none min-w-0"
              dir={dir}
              data-testid="input-search"
            />

            {/* Search button */}
            <button
              className="bg-primary hover:bg-primary/90 text-[#0A1628] px-4 flex items-center justify-center flex-shrink-0 transition-colors"
              data-testid="button-search"
            >
              <Search className="w-5 h-5 font-bold" />
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          {/* Language toggle (desktop) */}
          <button
            onClick={toggleLanguage}
            className="hidden md:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-toggle-lang"
          >
            <span className="text-white/60 text-[10px] leading-tight">{lang === 'en' ? 'اللغة' : 'Language'}</span>
            <span className="text-white text-xs font-bold">{lang === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Account */}
          <button
            className="hidden md:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-account"
          >
            <span className="text-white/60 text-[10px] leading-tight">
              {lang === 'en' ? 'Hello, Sign in' : 'مرحباً، سجل الدخول'}
            </span>
            <span className="text-white text-xs font-bold flex items-center gap-1">
              {t('common.account')}
              <ChevronDown className="w-3 h-3" />
            </span>
          </button>

          {/* Returns */}
          <button
            className="hidden lg:flex flex-col items-start rtl:items-end text-left rtl:text-right hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-returns"
          >
            <span className="text-white/60 text-[10px] leading-tight">
              {lang === 'en' ? 'Returns' : 'المرتجعات'}
            </span>
            <span className="text-white text-xs font-bold">{lang === 'en' ? '& Orders' : 'والطلبات'}</span>
          </button>

          {/* Cart */}
          <button
            className="flex items-end gap-1 hover:border hover:border-white/30 rounded p-1 transition-all"
            data-testid="button-cart"
          >
            <div className="relative">
              <ShoppingCart className="w-7 h-7 text-white" />
              <span className="absolute -top-1.5 left-3 rtl:left-auto rtl:right-3 bg-primary text-[#0A1628] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            </div>
            <span className="text-white text-xs font-bold hidden sm:block">{t('common.cart')}</span>
          </button>

          {/* Mobile account icon */}
          <button className="md:hidden text-white" data-testid="button-account-mobile">
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ── Category nav bar ── */}
      <div className="bg-[#112240] border-b border-white/5 overflow-x-auto hidden md:block">
        <div className="flex items-center px-4 h-9 gap-1 w-max">
          <button
            className="flex items-center gap-1.5 px-3 h-full text-white text-xs font-semibold hover:bg-white/10 rounded transition-colors whitespace-nowrap"
            data-testid="nav-all"
          >
            <Menu className="w-4 h-4" />
            {t('nav.all')}
          </button>
          {(['deals', 'electronics', 'fashion', 'home', 'beauty', 'sports', 'books'] as const).map((key) => (
            <button
              key={key}
              className="px-3 h-full text-white/80 text-xs hover:bg-white/10 hover:text-primary rounded transition-colors whitespace-nowrap"
              data-testid={`nav-${key}`}
            >
              {t(`nav.${key}`)}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            className="px-3 h-full text-primary text-xs font-semibold hover:bg-white/10 rounded transition-colors whitespace-nowrap"
            data-testid="nav-become-vendor"
          >
            {t('common.becomeVendor')}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0A1628] border-t border-white/10 p-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder={t('common.search')}
              className="w-full bg-white text-[#0A1628] placeholder-gray-400 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 text-sm outline-none rounded"
              dir={dir}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['deals', 'electronics', 'fashion', 'home', 'beauty'] as const).map((key) => (
              <button key={key} className="px-3 py-1 bg-[#112240] text-white/80 text-xs rounded border border-white/10">
                {t(`nav.${key}`)}
              </button>
            ))}
          </div>
          <button
            className="w-full bg-primary text-[#0A1628] font-semibold py-2 rounded text-sm"
            data-testid="button-become-vendor-mobile"
          >
            {t('common.becomeVendor')}
          </button>
        </div>
      )}
    </header>
  );
}
