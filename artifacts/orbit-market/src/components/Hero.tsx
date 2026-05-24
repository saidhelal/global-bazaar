import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Truck, ShieldCheck, RefreshCw, Award } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop',
    badge: { en: '✦ New Arrivals', ar: '✦ وصل حديثاً' },
    title: { en: 'Discover Global\nLuxury', ar: 'اكتشف الفخامة\nالعالمية' },
    sub: { en: 'Premium products from verified vendors worldwide', ar: 'منتجات مميزة من بائعين معتمدين حول العالم' },
    cta: { en: 'Shop Now', ar: 'تسوق الآن' },
    ctaLink: '/products',
    secondary: { en: 'View Deals', ar: 'عرض التخفيضات' },
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop',
    badge: { en: '✦ New Season', ar: '✦ موسم جديد' },
    title: { en: 'New Season\nArrivals', ar: 'أحدث تشكيلات\nالموسم' },
    sub: { en: 'Fresh styles from top international brands', ar: 'أساليب جديدة من أبرز العلامات التجارية الدولية' },
    cta: { en: 'Explore Collection', ar: 'استكشف المجموعة' },
    ctaLink: '/products?category=Fashion',
    secondary: { en: 'Learn More', ar: 'اعرف أكثر' },
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop',
    badge: { en: '✦ Up to 50% Off', ar: '✦ خصم حتى 50٪' },
    title: { en: 'Exclusive\nVendor Deals', ar: 'عروض حصرية\nمن البائعين' },
    sub: { en: 'Save up to 50% on selected premium products', ar: 'وفر حتى 50٪ على منتجات مميزة مختارة' },
    cta: { en: 'See All Deals', ar: 'جميع العروض' },
    ctaLink: '/products?sort=price_asc',
    secondary: { en: 'Browse All', ar: 'تصفح الكل' },
  },
];

const trustBadges = [
  { Icon: Truck,       en: 'Free Delivery',    ar: 'توصيل مجاني',     sub: { en: 'On orders over $100', ar: 'للطلبات فوق 100$' } },
  { Icon: ShieldCheck, en: 'Buyer Protection',  ar: 'حماية المشتري',    sub: { en: '100% Secure checkout', ar: 'دفع آمن 100%' } },
  { Icon: RefreshCw,   en: 'Easy Returns',      ar: 'إرجاع سهل',        sub: { en: '30-day return policy', ar: 'سياسة إرجاع 30 يوم' } },
  { Icon: Award,       en: 'Premium Quality',   ar: 'جودة ممتازة',       sub: { en: 'Verified vendors only', ar: 'بائعون معتمدون فقط' } },
];

export default function Hero() {
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const INTERVAL = 5000;

  const next = useCallback(() => {
    setCurrent(p => (p + 1) % slides.length);
    setProgress(0);
  }, []);
  const prev = useCallback(() => {
    setCurrent(p => (p - 1 + slides.length) % slides.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (paused) return;
    const tick = 50;
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { next(); return 0; }
        return p + (100 / (INTERVAL / tick));
      });
    }, tick);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = slides[current];

  return (
    <div className="relative w-full overflow-hidden bg-[#050E1F]" dir={dir}>
      {/* Main hero area */}
      <div
        className="relative"
        style={{ height: 'clamp(300px, 48vw, 560px)' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Background image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            <img src={slide.image} alt="" className="w-full h-full object-cover object-center" />
            {/* Multi-layer gradient overlay */}
            <div className="absolute inset-0" style={{
              background: dir === 'ltr'
                ? 'linear-gradient(to right, rgba(5,14,31,0.97) 0%, rgba(5,14,31,0.82) 35%, rgba(5,14,31,0.35) 65%, rgba(5,14,31,0.1) 100%)'
                : 'linear-gradient(to left, rgba(5,14,31,0.97) 0%, rgba(5,14,31,0.82) 35%, rgba(5,14,31,0.35) 65%, rgba(5,14,31,0.1) 100%)',
            }} />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050E1F] to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="px-6 md:px-14 lg:px-20 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${slide.id}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-3 md:space-y-4"
              >
                {/* Badge */}
                <motion.span
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-block text-[#D4AF37] text-xs font-bold tracking-[0.15em] uppercase bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1 rounded-full"
                >
                  {slide.badge[lang]}
                </motion.span>

                {/* Title */}
                <h1 className="text-white font-extrabold leading-[1.1] tracking-tight"
                  style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3.5rem)' }}>
                  {slide.title[lang].split('\n').map((line, i) => (
                    <span key={i} className="block">{line}</span>
                  ))}
                </h1>

                {/* Subtitle */}
                <p className="text-white/65 leading-relaxed max-w-sm"
                  style={{ fontSize: 'clamp(0.8rem, 1.6vw, 1rem)' }}>
                  {slide.sub[lang]}
                </p>

                {/* CTAs */}
                <div className="flex gap-3 pt-1 flex-wrap">
                  <button
                    onClick={() => setLocation(slide.ctaLink)}
                    className="bg-[#D4AF37] text-[#050E1F] font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#c9a432] active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20"
                    data-testid={`button-hero-cta-${slide.id}`}
                  >
                    {slide.cta[lang]}
                  </button>
                  <button
                    onClick={() => setLocation('/products')}
                    className="border border-white/25 text-white/85 px-6 py-2.5 rounded-xl text-sm hover:bg-white/10 hover:border-white/40 transition-all backdrop-blur-sm"
                    data-testid={`button-hero-secondary-${slide.id}`}
                  >
                    {slide.secondary[lang]}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Prev/Next */}
        <button
          onClick={dir === 'rtl' ? next : prev}
          className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/10 hover:border-white/25 z-10"
          data-testid="button-hero-prev"
        >
          {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <button
          onClick={dir === 'rtl' ? prev : next}
          className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/10 hover:border-white/25 z-10"
          data-testid="button-hero-next"
        >
          {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {/* Slide indicators with progress */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setProgress(0); }}
              className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: i === current ? 32 : 8, background: 'rgba(255,255,255,0.25)' }}
              data-testid={`button-hero-dot-${i}`}
            >
              {i === current && (
                <div
                  className="absolute inset-y-0 left-0 bg-[#D4AF37] rounded-full transition-none"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Trust badges strip */}
      <div className="bg-[#0A1628] border-t border-white/[0.06] border-b border-b-white/[0.04]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06] rtl:divide-x-reverse">
            {trustBadges.map(({ Icon, en, ar, sub }) => (
              <div key={en} className="flex items-center gap-3 px-4 py-3 md:py-4">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{lang === 'ar' ? ar : en}</p>
                  <p className="text-white/40 text-[10px] truncate">{lang === 'ar' ? sub.ar : sub.en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
