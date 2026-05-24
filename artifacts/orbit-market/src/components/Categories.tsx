import { useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import { CATEGORIES } from '../data/categories';

export default function Categories() {
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();

  function navTo(catValue: string) {
    setLocation(`/products?category=${encodeURIComponent(catValue)}`);
  }

  return (
    <section className="py-6" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg md:text-xl">
            {lang === 'ar' ? 'تسوق حسب القسم' : 'Shop by Department'}
          </h2>
          <button
            onClick={() => setLocation('/products')}
            className="text-primary text-sm font-semibold hover:underline">
            {lang === 'ar' ? 'عرض الكل' : 'See all'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => navTo(cat.value)}
              data-testid={`card-category-${cat.value}`}
              className="bg-[#112240] rounded-xl overflow-hidden text-left rtl:text-right hover:ring-2 hover:ring-primary/50 transition-all group border border-white/5 hover:border-primary/30">

              {/* Category name + emoji */}
              <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
                <span className="text-xl">{cat.emoji}</span>
                <h3 className="text-white font-bold text-xs leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {lang === 'ar' ? cat.ar : cat.en}
                </h3>
              </div>

              {/* 2×2 image grid */}
              <div className="grid grid-cols-2 gap-0.5 mx-2.5 mb-1">
                {cat.cardImages.map((src, i) => (
                  <div key={i} className="aspect-square overflow-hidden bg-[#0A1628] rounded-sm">
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>

              {/* Subcategory preview + see more */}
              <div className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {cat.subcategories.slice(0, 2).map(sub => (
                    <span key={sub.value} className="text-white/40 text-[9px]">
                      {lang === 'ar' ? sub.ar : sub.en}{cat.subcategories.indexOf(sub) < Math.min(1, cat.subcategories.length - 1) ? ' ·' : ''}
                    </span>
                  ))}
                  {cat.subcategories.length > 2 && (
                    <span className="text-white/25 text-[9px]">+{cat.subcategories.length - 2}</span>
                  )}
                </div>
                <span className="text-primary text-xs font-semibold group-hover:underline">
                  {lang === 'ar' ? 'تسوق الآن' : 'Shop now'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
