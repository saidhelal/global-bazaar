import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

export type Currency = 'USD' | 'EGP' | 'SAR' | 'AED';

export const RATES: Record<Currency, number> = {
  USD: 1,
  EGP: 50.15,
  SAR: 3.75,
  AED: 3.67,
};

export const CURRENCY_META: Record<Currency, {
  code: Currency;
  symbolEn: string;
  symbolAr: string;
  flag: string;
  nameEn: string;
  nameAr: string;
}> = {
  USD: { code: 'USD', symbolEn: '$',   symbolAr: '$',    flag: '🇺🇸', nameEn: 'US Dollar',      nameAr: 'دولار أمريكي' },
  EGP: { code: 'EGP', symbolEn: 'EGP', symbolAr: 'ج.م', flag: '🇪🇬', nameEn: 'Egyptian Pound',  nameAr: 'جنيه مصري'   },
  SAR: { code: 'SAR', symbolEn: 'SAR', symbolAr: 'ر.س', flag: '🇸🇦', nameEn: 'Saudi Riyal',     nameAr: 'ريال سعودي'  },
  AED: { code: 'AED', symbolEn: 'AED', symbolAr: 'د.إ', flag: '🇦🇪', nameEn: 'UAE Dirham',      nameAr: 'درهم إماراتي'},
};

export const ALL_CURRENCIES: Currency[] = ['USD', 'EGP', 'SAR', 'AED'];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Format a USD price into the selected currency string */
  formatPrice: (usdAmount: number) => string;
  /** Convert a USD amount to the display currency value */
  toDisplay: (usdAmount: number) => number;
  /** Convert a display-currency amount back to USD */
  fromDisplay: (displayAmount: number) => number;
  /** Free-shipping threshold in the display currency */
  freeShippingThreshold: number;
  rate: number;
  symbol: string;
  meta: typeof CURRENCY_META[Currency];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useLanguage();

  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      return (localStorage.getItem('orbit_currency') as Currency) || 'USD';
    } catch {
      return 'USD';
    }
  });

  // Persist selection
  useEffect(() => {
    try { localStorage.setItem('orbit_currency', currency); } catch { /* ignore */ }
  }, [currency]);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
  }

  const rate = RATES[currency];
  const meta = CURRENCY_META[currency];
  const symbol = lang === 'ar' ? meta.symbolAr : meta.symbolEn;

  function toDisplay(usdAmount: number): number {
    return usdAmount * rate;
  }

  function fromDisplay(displayAmount: number): number {
    return displayAmount / rate;
  }

  function formatPrice(usdAmount: number): string {
    const amount = usdAmount * rate;
    const formatted = amount.toFixed(currency === 'EGP' ? 0 : 2);
    if (currency === 'USD') return `$${formatted}`;
    return lang === 'ar'
      ? `${Number(formatted).toLocaleString('ar')} ${meta.symbolAr}`
      : `${meta.symbolEn} ${Number(formatted).toLocaleString('en')}`;
  }

  const freeShippingThreshold = 100 * rate;

  return (
    <CurrencyContext.Provider value={{
      currency, setCurrency, formatPrice, toDisplay, fromDisplay,
      freeShippingThreshold, rate, symbol, meta,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
