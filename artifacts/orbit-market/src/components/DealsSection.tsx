import { useState, useEffect } from 'react';
import { Clock, ChevronRight, Flame } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';

const deals = [
  {
    id: 1,
    name: { en: 'Pro Max Headphones', ar: 'سماعات برو ماكس' },
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=400&auto=format&fit=crop',
    originalPrice: 549, discountPct: 32, rating: 4.8, reviews: 2341, prime: true, claimed: 72,
  },
  {
    id: 2,
    name: { en: 'Artisan Coffee Set', ar: 'طقم قهوة فاخر' },
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=400&auto=format&fit=crop',
    originalPrice: 120, discountPct: 45, rating: 4.7, reviews: 876, prime: false, claimed: 88,
  },
  {
    id: 3,
    name: { en: 'Leather Weekender Bag', ar: 'حقيبة سفر جلدية' },
    image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=400&auto=format&fit=crop',
    originalPrice: 345, discountPct: 28, rating: 4.9, reviews: 1543, prime: true, claimed: 55,
  },
  {
    id: 4,
    name: { en: 'Smart Fitness Mirror', ar: 'مرآة اللياقة الذكية' },
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop',
    originalPrice: 1495, discountPct: 20, rating: 4.6, reviews: 423, prime: true, claimed: 41,
  },
  {
    id: 5,
    name: { en: 'Chronograph Watch', ar: 'ساعة كرونوغراف' },
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=400&auto=format&fit=crop',
    originalPrice: 1250, discountPct: 15, rating: 5.0, reviews: 789, prime: false, claimed: 30,
  },
  {
    id: 6,
    name: { en: 'Carbon Steering Wheel', ar: 'عجلة قيادة كربون' },
    image: 'https://images.unsplash.com/photo-1600705353592-257a0772718e?q=80&w=400&auto=format&fit=crop',
    originalPrice: 850, discountPct: 18, rating: 4.8, reviews: 312, prime: true, claimed: 60,
  },
  {
    id: 7,
    name: { en: 'Premium Skincare Set', ar: 'طقم العناية بالبشرة' },
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=400&auto=format&fit=crop',
    originalPrice: 280, discountPct: 35, rating: 4.7, reviews: 654, prime: true, claimed: 79,
  },
  {
    id: 8,
    name: { en: 'Wireless Keyboard', ar: 'لوحة مفاتيح لاسلكية' },
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=400&auto=format&fit=crop',
    originalPrice: 180, discountPct: 22, rating: 4.5, reviews: 1120, prime: false, claimed: 47,
  },
];

function useCountdown() {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const initial = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);

  const [secs, setSecs] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return { h, m, s };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function DealsSection() {
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const time = useCountdown();

  return (
    <section className="py-4" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <div className="bg-[#0D1E3C] rounded-2xl overflow-hidden border border-white/[0.07] shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                <h2 className="text-white font-bold text-base md:text-lg">
                  {lang === 'ar' ? 'عروض اليوم' : "Today's Deals"}
                </h2>
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-1.5 bg-[#0A1628] border border-white/10 rounded-lg px-2.5 py-1">
                <Clock className="w-3 h-3 text-[#D4AF37]" />
                <span className="text-white/60 text-xs">{lang === 'ar' ? 'ينتهي خلال:' : 'Ends in:'}</span>
                <div className="flex items-center gap-0.5 font-mono font-bold text-xs">
                  {[pad(time.h), pad(time.m), pad(time.s)].map((unit, i) => (
                    <span key={i} className="flex items-center gap-0.5">
                      <span className="bg-[#112240] text-white px-1 py-0.5 rounded text-[11px]">{unit}</span>
                      {i < 2 && <span className="text-white/40">:</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setLocation('/products?sort=price_asc')}
              className="flex items-center gap-1 text-[#D4AF37] text-sm font-semibold hover:underline whitespace-nowrap"
              data-testid="button-see-all-deals"
            >
              {lang === 'ar' ? 'جميع العروض' : 'See all deals'}
              <ChevronRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Deals grid — horizontal scroll */}
          <div className="flex overflow-x-auto scrollbar-hide divide-x divide-white/[0.05] rtl:divide-x-reverse">
            {deals.map((deal) => {
              const salePrice = deal.originalPrice * (1 - deal.discountPct / 100);
              const isAlmostGone = deal.claimed >= 75;
              return (
                <button
                  key={deal.id}
                  className="flex-shrink-0 w-40 md:w-48 p-3.5 hover:bg-white/[0.04] transition-colors text-left rtl:text-right group border-0 outline-none"
                  data-testid={`card-deal-${deal.id}`}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#0A1628] mb-3">
                    <img
                      src={deal.image}
                      alt={deal.name[lang]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-[#D4AF37] text-[#050E1F] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      -{deal.discountPct}%
                    </div>
                  </div>

                  <p className="text-[#D4AF37] text-[9px] font-bold uppercase tracking-wider mb-1">
                    {lang === 'ar' ? 'عرض لفترة محدودة' : 'Limited time deal'}
                  </p>

                  <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-2">
                    {deal.name[lang]}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-[10px] ${i < Math.round(deal.rating) ? 'text-[#D4AF37]' : 'text-white/15'}`}>★</span>
                      ))}
                    </div>
                    <span className="text-white/40 text-[9px]">({deal.reviews >= 1000 ? `${(deal.reviews/1000).toFixed(1)}k` : deal.reviews})</span>
                  </div>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="text-white font-bold text-sm">${salePrice.toFixed(0)}</span>
                    <span className="text-white/30 line-through text-xs ml-1.5 rtl:mr-1.5 rtl:ml-0">${deal.originalPrice}</span>
                  </div>

                  {/* Claimed progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-semibold ${isAlmostGone ? 'text-orange-400' : 'text-white/40'}`}>
                        {isAlmostGone
                          ? (lang === 'ar' ? '⚡ على وشك النفاد!' : '⚡ Almost gone!')
                          : (lang === 'ar' ? `${deal.claimed}% تم المطالبة` : `${deal.claimed}% claimed`)
                        }
                      </span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isAlmostGone ? 'bg-orange-400' : 'bg-[#D4AF37]/60'}`}
                        style={{ width: `${deal.claimed}%` }}
                      />
                    </div>
                  </div>

                  {deal.prime && (
                    <div className="mt-2 inline-block bg-[#D4AF37]/15 text-[#D4AF37] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
                      {lang === 'en' ? '✦ ORBIT PRIME' : '✦ أوربت برايم'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
