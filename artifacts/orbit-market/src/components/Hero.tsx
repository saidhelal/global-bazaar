import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop',
    gradient: 'from-[#0A1628] via-[#0A1628]/60 to-transparent',
    titleKey: 'hero.slide1Title' as const,
    subKey: 'hero.slide1Sub' as const,
    ctaKey: 'hero.slide1Cta' as const,
    accent: '#D4AF37',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop',
    gradient: 'from-[#0A1628] via-[#0A1628]/50 to-transparent',
    titleKey: 'hero.slide2Title' as const,
    subKey: 'hero.slide2Sub' as const,
    ctaKey: 'hero.slide2Cta' as const,
    accent: '#D4AF37',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop',
    gradient: 'from-[#0A1628] via-[#0A1628]/55 to-transparent',
    titleKey: 'hero.slide3Title' as const,
    subKey: 'hero.slide3Sub' as const,
    ctaKey: 'hero.slide3Cta' as const,
    accent: '#D4AF37',
  },
];

type SlideKey = 'hero.slide1Title' | 'hero.slide1Sub' | 'hero.slide1Cta'
  | 'hero.slide2Title' | 'hero.slide2Sub' | 'hero.slide2Cta'
  | 'hero.slide3Title' | 'hero.slide3Sub' | 'hero.slide3Cta';

export default function Hero() {
  const { lang, dir } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const getSlideText = (key: SlideKey) => {
    const parts = key.split('.');
    const heroData = {
      en: {
        'slide1Title': 'Discover Global Luxury',
        'slide1Sub': 'Premium products from verified vendors worldwide',
        'slide1Cta': 'Shop Now',
        'slide2Title': 'New Season Arrivals',
        'slide2Sub': 'Fresh styles from top international brands',
        'slide2Cta': 'Explore Collection',
        'slide3Title': 'Exclusive Vendor Deals',
        'slide3Sub': 'Save up to 50% on selected premium products',
        'slide3Cta': 'See All Deals',
      },
      ar: {
        'slide1Title': 'اكتشف الفخامة العالمية',
        'slide1Sub': 'منتجات مميزة من بائعين معتمدين حول العالم',
        'slide1Cta': 'تسوق الآن',
        'slide2Title': 'أحدث تشكيلات الموسم',
        'slide2Sub': 'أساليب جديدة من أبرز العلامات التجارية الدولية',
        'slide2Cta': 'استكشف المجموعة',
        'slide3Title': 'عروض حصرية من البائعين',
        'slide3Sub': 'وفر حتى 50٪ على منتجات مميزة مختارة',
        'slide3Cta': 'جميع العروض',
      }
    };
    return heroData[lang][parts[1] as keyof typeof heroData['en']] || key;
  };

  const next = useCallback(() => setCurrent((p) => (p + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = slides[current];

  return (
    <div
      className="relative w-full overflow-hidden bg-[#0A1628]"
      style={{ height: 'clamp(280px, 45vw, 520px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      dir={dir}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt=""
            className="w-full h-full object-cover object-center"
          />
          {/* Gradient overlay - direction-aware */}
          <div
            className="absolute inset-0"
            style={{
              background: dir === 'ltr'
                ? 'linear-gradient(to right, #0A1628 0%, rgba(10,22,40,0.75) 45%, transparent 100%)'
                : 'linear-gradient(to left, #0A1628 0%, rgba(10,22,40,0.75) 45%, transparent 100%)',
            }}
          />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A1628] to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="px-8 md:px-16 max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${slide.id}`}
              initial={{ opacity: 0, x: dir === 'rtl' ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === 'rtl' ? -30 : 30 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                {getSlideText(slide.titleKey)}
              </h1>
              <p className="text-sm md:text-base text-white/75 max-w-sm leading-relaxed">
                {getSlideText(slide.subKey)}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  className="bg-primary text-[#0A1628] font-bold px-6 py-2.5 rounded text-sm hover:bg-primary/90 transition-colors"
                  data-testid={`button-hero-cta-${slide.id}`}
                >
                  {getSlideText(slide.ctaKey)}
                </button>
                <button
                  className="border border-white/40 text-white px-6 py-2.5 rounded text-sm hover:bg-white/10 transition-colors"
                  data-testid={`button-hero-secondary-${slide.id}`}
                >
                  {lang === 'en' ? 'Learn more' : 'اعرف أكثر'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={dir === 'rtl' ? next : prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
        data-testid="button-hero-prev"
      >
        {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
      <button
        onClick={dir === 'rtl' ? prev : next}
        className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
        data-testid="button-hero-next"
      >
        {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-primary w-6' : 'bg-white/40 w-1.5'}`}
            data-testid={`button-hero-dot-${i}`}
          />
        ))}
      </div>
    </div>
  );
}
