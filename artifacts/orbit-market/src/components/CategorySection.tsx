import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiFetch } from '../contexts/AuthContext';
import type { Category } from '../data/categories';

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/300/300';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

interface CategorySectionProps {
  category: Category;
}

export default function CategorySection({ category }: CategorySectionProps) {
  const { lang, dir } = useLanguage();
  const { formatPrice } = useCurrency();
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (activeSub) { qs.set('category', activeSub); } else { qs.set('category', category.value); }
    qs.set('limit', '12');
    qs.set('sort', 'newest');
    apiFetch(`/products?${qs.toString()}`)
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category.value, activeSub]);

  function scrollCarousel(dir: 'left' | 'right') {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  const catName = lang === 'ar' ? category.ar : category.en;
  const seeAllUrl = `/products?category=${encodeURIComponent(activeSub || category.value)}`;

  return (
    <section className="py-5" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{category.emoji}</span>
            <h2 className="text-white font-bold text-lg md:text-xl">{catName}</h2>
          </div>
          <Link href={seeAllUrl}
            className="flex items-center gap-1 text-primary text-sm font-semibold hover:underline">
            {lang === 'ar' ? 'عرض الكل' : 'See all'}
            <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </Link>
        </div>

        {/* Subcategory chips */}
        {category.subcategories.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setActiveSub('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${activeSub === '' ? 'bg-primary text-[#0A1628] border-primary' : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white bg-white/5'}`}>
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            {category.subcategories.map(sub => (
              <button
                key={sub.value}
                onClick={() => setActiveSub(sub.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${activeSub === sub.value ? 'bg-primary text-[#0A1628] border-primary' : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white bg-white/5'}`}>
                {lang === 'ar' ? sub.ar : sub.en}
              </button>
            ))}
          </div>
        )}

        {/* Carousel */}
        <div className="relative group">
          {/* Scroll left */}
          <button
            onClick={() => scrollCarousel('left')}
            className="absolute left-0 rtl:left-auto rtl:right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-[#0A1628]/90 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-[#112240] -translate-x-1/2 rtl:translate-x-1/2">
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>

          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44 bg-[#112240] rounded-xl animate-pulse" style={{ height: 260 }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex gap-3">
              {/* Show category image tiles when no products */}
              {category.cardImages.map((img, i) => (
                <div key={i} className="flex-shrink-0 w-44 bg-[#112240] rounded-xl overflow-hidden border border-white/5 aspect-square">
                  <img src={img} alt="" className="w-full h-full object-cover opacity-60" />
                </div>
              ))}
              <div className="flex-shrink-0 w-44 bg-[#112240] rounded-xl border border-white/5 flex flex-col items-center justify-center p-4 gap-2">
                <span className="text-3xl">{category.emoji}</span>
                <p className="text-white/50 text-xs text-center">{lang === 'ar' ? 'قريباً' : 'Products coming soon'}</p>
                <button
                  onClick={() => setLocation('/dashboard/products/new')}
                  className="text-primary text-xs font-semibold hover:underline">
                  {lang === 'ar' ? 'بيع هنا' : 'Sell here'}
                </button>
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
              {products.map(p => {
                const title = (lang === 'ar' && p.titleAr) ? p.titleAr : p.title;
                const price = parseFloat(p.price);
                const rating = parseFloat(p.rating || '0');
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="flex-shrink-0 w-44 bg-[#112240] rounded-xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all group/card hover:shadow-lg hover:shadow-primary/5">
                    <div className="aspect-square overflow-hidden bg-[#0A1628]">
                      <img
                        src={getImgUrl(p.coverImage)}
                        alt={title}
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/p/300/300'; }}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-white text-xs font-semibold leading-snug line-clamp-2 mb-1">{title}</p>
                      {rating > 0 && (
                        <div className="flex items-center gap-1 mb-1">
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <span key={s} className={`text-[10px] ${s <= Math.round(rating) ? 'text-[#D4AF37]' : 'text-white/15'}`}>★</span>
                            ))}
                          </div>
                          <span className="text-white/30 text-[9px]">({p.reviewCount || 0})</span>
                        </div>
                      )}
                      <p className="text-primary font-bold text-sm">{formatPrice(price)}</p>
                      {p.compareAtPrice && (
                        <p className="text-white/30 text-[10px] line-through">{formatPrice(parseFloat(p.compareAtPrice))}</p>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* "See all" card at end */}
              <Link
                href={seeAllUrl}
                className="flex-shrink-0 w-40 bg-[#112240] rounded-xl border border-white/5 border-dashed flex flex-col items-center justify-center p-4 gap-2 hover:border-primary/30 transition-colors">
                <span className="text-3xl">{category.emoji}</span>
                <p className="text-white/60 text-xs text-center">
                  {lang === 'ar' ? `عرض كل ${category.ar}` : `See all ${category.en}`}
                </p>
                <ArrowRight className={`w-5 h-5 text-primary ${lang === 'ar' ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          )}

          {/* Scroll right */}
          <button
            onClick={() => scrollCarousel('right')}
            className="absolute right-0 rtl:right-auto rtl:left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-[#0A1628]/90 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-[#112240] translate-x-1/2 rtl:-translate-x-1/2">
            <ChevronRight className="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </section>
  );
}
