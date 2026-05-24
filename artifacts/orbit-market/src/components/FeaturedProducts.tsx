import { motion } from 'framer-motion';
import { Star, Heart, ShoppingCart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { products } from '../data/products';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < Math.floor(rating)
              ? 'fill-primary text-primary'
              : i < rating
              ? 'fill-primary/50 text-primary/50'
              : 'text-white/20'
          }`}
        />
      ))}
    </div>
  );
}

type ProductRow = {
  title: { en: string; ar: string };
  items: typeof products;
};

export default function FeaturedProducts() {
  const { lang, dir } = useLanguage();

  const addToCartLabel = lang === 'en' ? 'Add to cart' : 'أضف للسلة';
  const viewAllLabel   = lang === 'en' ? 'See all results' : 'عرض كل النتائج';

  const rows: ProductRow[] = [
    { title: { en: 'Recommended for You', ar: 'موصى به لك' }, items: products.slice(0, 5) },
    { title: { en: 'Top Picks in Electronics', ar: 'أبرز اختيارات الإلكترونيات' }, items: products.slice(3, 8) },
  ];

  return (
    <section className="bg-[#0A1628] space-y-0" dir={dir}>
      {rows.map((row) => (
        <div key={row.title.en} className="max-w-[1400px] mx-auto px-3 md:px-6 py-1">
          <div className="bg-[#112240] rounded-lg overflow-hidden">
            {/* Row header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-base md:text-lg font-bold text-white">{row.title[lang]}</h2>
              <button className="text-primary text-sm hover:underline" data-testid={`button-view-all-${row.title.en.replace(/\s/g, '-').toLowerCase()}`}>
                {viewAllLabel}
              </button>
            </div>

            {/* Products — horizontal scroll on mobile, grid on desktop */}
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="flex overflow-x-auto md:grid md:grid-cols-5 divide-x divide-white/5 rtl:divide-x-reverse scrollbar-hide"
            >
              {row.items.map((product) => (
                <motion.div
                  key={product.id}
                  variants={item}
                  className="flex-shrink-0 w-44 md:w-auto p-4 hover:bg-white/5 transition-colors group relative cursor-pointer"
                  data-testid={`card-product-${product.id}`}
                >
                  {/* Wishlist */}
                  <button
                    className="absolute top-3 right-3 rtl:right-auto rtl:left-3 w-7 h-7 rounded-full bg-[#0A1628]/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 text-white/60"
                    data-testid={`button-wishlist-${product.id}`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>

                  {/* Image */}
                  <div className="aspect-square w-full overflow-hidden rounded bg-[#0A1628] mb-3">
                    <img
                      src={product.image}
                      alt={product.name[lang]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                      loading="lazy"
                    />
                  </div>

                  {/* Name */}
                  <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-1.5">
                    {product.name[lang]}
                  </p>

                  {/* Vendor */}
                  <p className="text-white/40 text-[10px] mb-1.5">{product.vendor}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <StarRating rating={product.rating} />
                    <span className="text-white/50 text-[10px]">(128)</span>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <span className="text-white font-bold text-sm">${product.priceUSD.toFixed(2)}</span>
                    <p className="text-white/40 text-[10px]">
                      {lang === 'en'
                        ? `SAR ${product.priceSAR.toFixed(2)}`
                        : `${product.priceSAR.toFixed(2)} ر.س`}
                    </p>
                  </div>

                  {/* Add to cart */}
                  <button
                    className="w-full bg-primary/20 hover:bg-primary text-primary hover:text-[#0A1628] text-xs font-semibold py-1.5 rounded transition-colors flex items-center justify-center gap-1.5"
                    data-testid={`button-add-to-cart-${product.id}`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {addToCartLabel}
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
