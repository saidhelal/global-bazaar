import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

const categoryData = [
  {
    id: 'electronics',
    images: [
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?q=80&w=200&auto=format&fit=crop',
    ],
  },
  {
    id: 'fashion',
    images: [
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop',
    ],
  },
  {
    id: 'homeAndLiving',
    images: [
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=200&auto=format&fit=crop',
    ],
  },
  {
    id: 'beauty',
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=200&auto=format&fit=crop',
    ],
  },
  {
    id: 'sports',
    images: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1584735175315-9d5df23be620?q=80&w=200&auto=format&fit=crop',
    ],
  },
  {
    id: 'books',
    images: [
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=200&auto=format&fit=crop',
    ],
  },
  {
    id: 'toys',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=200&auto=format&fit=crop',
    ],
  },
  {
    id: 'automotive',
    images: [
      'https://images.unsplash.com/photo-1600705353592-257a0772718e?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1616788494672-ec7ca25fdda9?q=80&w=200&auto=format&fit=crop',
    ],
  },
];

const categoryNames: Record<string, { en: string; ar: string }> = {
  electronics:  { en: 'Electronics',     ar: 'إلكترونيات' },
  fashion:      { en: 'Fashion',          ar: 'أزياء' },
  homeAndLiving:{ en: 'Home & Living',   ar: 'المنزل والمعيشة' },
  beauty:       { en: 'Beauty',           ar: 'التجميل' },
  sports:       { en: 'Sports',           ar: 'الرياضة' },
  books:        { en: 'Books',            ar: 'كتب' },
  toys:         { en: 'Toys',             ar: 'ألعاب' },
  automotive:   { en: 'Automotive',       ar: 'السيارات' },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Categories() {
  const { lang, dir } = useLanguage();
  const seeMoreLabel = lang === 'en' ? 'See more' : 'عرض المزيد';
  const sectionTitle = lang === 'en' ? 'Shop by Category' : 'تسوق حسب الفئة';

  return (
    <section className="bg-[#0A1628] py-0" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
        >
          {categoryData.map((cat) => (
            <motion.button
              key={cat.id}
              variants={item}
              className="bg-[#112240] rounded-lg overflow-hidden text-left rtl:text-right hover:ring-2 hover:ring-primary/60 transition-all group"
              data-testid={`card-category-${cat.id}`}
            >
              {/* Title */}
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-white font-bold text-sm md:text-base group-hover:text-primary transition-colors">
                  {categoryNames[cat.id]?.[lang] ?? cat.id}
                </h3>
              </div>

              {/* 2×2 image grid */}
              <div className="grid grid-cols-2 gap-0.5 mx-3 mb-1">
                {cat.images.map((src, i) => (
                  <div key={i} className="aspect-square overflow-hidden bg-[#0A1628]">
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>

              {/* See more */}
              <div className="px-4 py-3">
                <span className="text-primary text-xs font-semibold hover:underline">
                  {seeMoreLabel}
                </span>
              </div>
            </motion.button>
          ))}

          {/* Section header card (like Amazon) */}
          <motion.div
            variants={item}
            className="hidden md:flex col-span-4 items-center justify-between py-2"
          >
            <h2 className="text-white font-bold text-lg">{sectionTitle}</h2>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
