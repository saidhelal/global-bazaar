import { motion } from 'framer-motion';
import { Star, Heart, ShoppingCart, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import { products } from '../data/products';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-[11px] ${
          i < Math.floor(rating) ? 'text-[#D4AF37]' : i < rating ? 'text-[#D4AF37]/50' : 'text-white/15'
        }`}>★</span>
      ))}
    </div>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const card = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

type ProductRow = { title: { en: string; ar: string }; items: typeof products; link: string };

export default function FeaturedProducts() {
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();

  const rows: ProductRow[] = [
    { title: { en: 'Recommended for You', ar: 'موصى به لك' }, items: products.slice(0, 5), link: '/products' },
    { title: { en: 'Top Picks in Electronics', ar: 'أبرز اختيارات الإلكترونيات' }, items: products.slice(3, 8), link: '/products?category=Electronics' },
  ];

  return (
    <section className="space-y-4 pb-2" dir={dir}>
      {rows.map(row => (
        <div key={row.title.en} className="max-w-[1400px] mx-auto px-3 md:px-6">
          <div className="bg-[#0D1E3C] rounded-2xl overflow-hidden border border-white/[0.07]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-white font-bold text-base md:text-lg">{row.title[lang]}</h2>
              <button
                onClick={() => setLocation(row.link)}
                className="flex items-center gap-1 text-[#D4AF37] text-sm font-semibold hover:underline"
                data-testid={`button-view-all-${row.title.en.replace(/\s/g, '-').toLowerCase()}`}
              >
                {lang === 'ar' ? 'عرض الكل' : 'See all'}
                <ArrowRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Products — horizontal scroll → 5-col grid on lg */}
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="flex overflow-x-auto lg:grid lg:grid-cols-5 divide-x divide-white/[0.05] rtl:divide-x-reverse scrollbar-hide"
            >
              {row.items.map(product => (
                <motion.div
                  key={product.id}
                  variants={card}
                  className="flex-shrink-0 w-40 lg:w-auto p-4 hover:bg-white/[0.04] transition-colors group relative cursor-pointer"
                  onClick={() => setLocation('/products')}
                  data-testid={`card-product-${product.id}`}
                >
                  {/* Wishlist */}
                  <button
                    className="absolute top-3 right-3 rtl:right-auto rtl:left-3 w-7 h-7 rounded-full bg-[#050E1F]/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 text-white/50 backdrop-blur-sm"
                    onClick={e => e.stopPropagation()}
                    data-testid={`button-wishlist-${product.id}`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>

                  {/* Image */}
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#0A1628] mb-3">
                    <img
                      src={product.image}
                      alt={product.name[lang]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Title */}
                  <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-1.5">
                    {product.name[lang]}
                  </p>

                  {/* Vendor */}
                  <p className="text-white/35 text-[10px] mb-1.5 truncate">{product.vendor}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <StarRating rating={product.rating} />
                    <span className="text-white/40 text-[10px]">(128)</span>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <span className="text-[#D4AF37] font-bold text-sm">${product.priceUSD.toFixed(2)}</span>
                    <p className="text-white/35 text-[10px]">
                      {lang === 'en' ? `SAR ${product.priceSAR.toFixed(0)}` : `${product.priceSAR.toFixed(0)} ر.س`}
                    </p>
                  </div>

                  {/* Add to cart */}
                  <button
                    className="w-full bg-[#D4AF37]/12 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#050E1F] text-[11px] font-semibold py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 border border-[#D4AF37]/20 hover:border-[#D4AF37]"
                    data-testid={`button-add-to-cart-${product.id}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {lang === 'ar' ? 'أضف للسلة' : 'Add to cart'}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      ))}
    </section>
  );
}
