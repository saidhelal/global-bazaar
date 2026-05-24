import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const deals = [
  {
    id: 1,
    name: { en: 'Pro Max Headphones', ar: 'سماعات برو ماكس' },
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=400&auto=format&fit=crop',
    originalPrice: 549,
    discountPct: 32,
    rating: 4.8,
    reviews: 2341,
    prime: true,
  },
  {
    id: 2,
    name: { en: 'Artisan Coffee Set', ar: 'طقم قهوة فاخر' },
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=400&auto=format&fit=crop',
    originalPrice: 120,
    discountPct: 45,
    rating: 4.7,
    reviews: 876,
    prime: false,
  },
  {
    id: 3,
    name: { en: 'Leather Weekender Bag', ar: 'حقيبة سفر جلدية' },
    image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=400&auto=format&fit=crop',
    originalPrice: 345,
    discountPct: 28,
    rating: 4.9,
    reviews: 1543,
    prime: true,
  },
  {
    id: 4,
    name: { en: 'Smart Fitness Mirror', ar: 'مرآة اللياقة الذكية' },
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop',
    originalPrice: 1495,
    discountPct: 20,
    rating: 4.6,
    reviews: 423,
    prime: true,
  },
  {
    id: 5,
    name: { en: 'Chronograph Watch', ar: 'ساعة كرونوغراف' },
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=400&auto=format&fit=crop',
    originalPrice: 1250,
    discountPct: 15,
    rating: 5.0,
    reviews: 789,
    prime: false,
  },
  {
    id: 6,
    name: { en: 'Carbon Steering Wheel', ar: 'عجلة قيادة كربون' },
    image: 'https://images.unsplash.com/photo-1600705353592-257a0772718e?q=80&w=400&auto=format&fit=crop',
    originalPrice: 850,
    discountPct: 18,
    rating: 4.8,
    reviews: 312,
    prime: true,
  },
];

function useCountdown(targetHours = 8) {
  const [timeLeft, setTimeLeft] = useState({ h: targetHours, m: 23, s: 47 });

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        let { h, m, s } = prev;
        s -= 1;
        if (s < 0) { s = 59; m -= 1; }
        if (m < 0) { m = 59; h -= 1; }
        if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function DealsSection() {
  const { lang, dir } = useLanguage();
  const time = useCountdown(8);

  const dealLabel = lang === 'en' ? "Today's Deals" : 'عروض اليوم';
  const endsInLabel = lang === 'en' ? 'Ends in' : 'ينتهي خلال';
  const offLabel = lang === 'en' ? 'off' : 'خصم';
  const limitedLabel = lang === 'en' ? 'Limited time deal' : 'عرض لفترة محدودة';
  const seeAllLabel = lang === 'en' ? 'See all deals' : 'جميع العروض';

  return (
    <section className="bg-[#0A1628] py-0" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <div className="bg-[#112240] rounded-lg overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <h2 className="text-lg md:text-xl font-bold text-white">{dealLabel}</h2>
              <div className="hidden sm:flex items-center gap-1.5 text-primary text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>{endsInLabel}:</span>
                <span className="font-mono font-bold text-white bg-[#0A1628] px-1.5 py-0.5 rounded text-xs">
                  {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
                </span>
              </div>
            </div>
            <button className="text-primary text-sm hover:underline font-medium" data-testid="button-see-all-deals">
              {seeAllLabel}
            </button>
          </div>

          {/* Deals horizontal scroll */}
          <div className="flex overflow-x-auto gap-0 scrollbar-hide divide-x divide-white/5 rtl:divide-x-reverse">
            {deals.map((deal, idx) => {
              const salePrice = (deal.originalPrice * (1 - deal.discountPct / 100));
              return (
                <motion.button
                  key={deal.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07 }}
                  className="flex-shrink-0 w-44 md:w-52 p-4 hover:bg-white/5 transition-colors text-left rtl:text-right group"
                  data-testid={`card-deal-${deal.id}`}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square rounded overflow-hidden bg-[#0A1628] mb-3">
                    <img
                      src={deal.image}
                      alt={deal.name[lang]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Discount badge */}
                    <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-primary text-[#0A1628] text-xs font-bold px-1.5 py-0.5 rounded">
                      -{deal.discountPct}% {offLabel}
                    </div>
                  </div>

                  {/* Limited deal tag */}
                  <p className="text-primary text-[10px] font-semibold mb-1">{limitedLabel}</p>

                  {/* Name */}
                  <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-2">
                    {deal.name[lang]}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < Math.floor(deal.rating) ? 'fill-primary text-primary' : 'text-white/20'}`}
                        />
                      ))}
                    </div>
                    <span className="text-white/50 text-[10px]">({deal.reviews.toLocaleString()})</span>
                  </div>

                  {/* Price */}
                  <div>
                    <span className="text-white font-bold text-sm">${salePrice.toFixed(0)}</span>
                    <span className="text-white/40 line-through text-xs ml-1 rtl:mr-1 rtl:ml-0">
                      ${deal.originalPrice}
                    </span>
                  </div>

                  {deal.prime && (
                    <div className="mt-1.5 inline-block bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {lang === 'en' ? 'ORBIT PRIME' : 'أوربت برايم'}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
