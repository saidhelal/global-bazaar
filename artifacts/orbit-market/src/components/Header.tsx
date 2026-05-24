import { useState } from 'react';
import { ShoppingCart, User, Search, Menu, X, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Link } from 'wouter';
import { Input } from './ui/input';

export default function Header() {
  const { t, lang, toggleLanguage, dir } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center gap-4">
          <button 
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-background"></div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white uppercase hidden sm:block">
              {lang === 'en' ? 'Orbit Market' : 'سوق أوربت'}
            </span>
          </Link>
        </div>

        {/* Search - Desktop */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input 
            type="search" 
            placeholder={t('common.search')} 
            className="w-full bg-card/50 border-white/10 focus-visible:ring-primary pl-10 h-11 rounded-full"
            data-testid="input-search"
            dir={dir}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleLanguage}
            className="text-white hover:text-primary font-medium"
            data-testid="button-toggle-lang"
          >
            <Globe className="w-4 h-4 mr-2" />
            {lang === 'en' ? 'عربي' : 'EN'}
          </Button>

          <Button variant="ghost" size="icon" className="relative text-white" data-testid="button-cart">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
          </Button>

          <Button variant="ghost" size="icon" className="text-white hidden sm:flex" data-testid="button-account">
            <User className="w-5 h-5" />
          </Button>

          <Button className="hidden lg:flex bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" data-testid="button-become-vendor">
            {t('common.becomeVendor')}
          </Button>
        </div>
      </div>

      {/* Mobile Menu & Search */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-background p-4 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input 
              type="search" 
              placeholder={t('common.search')} 
              className="w-full bg-card/50 border-white/10 focus-visible:ring-primary pl-10"
              dir={dir}
            />
          </div>
          <Button className="w-full justify-start bg-card hover:bg-card/80 text-white border border-white/10">
            <User className="w-5 h-5 mr-2" />
            {t('common.account')}
          </Button>
          <Button className="w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
            {t('common.becomeVendor')}
          </Button>
        </div>
      )}
    </header>
  );
}
