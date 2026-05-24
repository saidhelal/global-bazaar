import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { vendors } from '../data/vendors';
import { Star, ShieldCheck, Package } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function VendorSpotlight() {
  const { lang, dir } = useLanguage();

  const title       = lang === 'en' ? 'Top Vendors'      : 'أبرز البائعين';
  const verified    = lang === 'en' ? 'Verified Vendor'  : 'بائع معتمد';
  const products    = lang === 'en' ? 'products'         : 'منتج';
  const visitStore  = lang === 'en' ? 'Visit Store'      : 'زيارة المتجر';
  const viewAll     = lang === 'en' ? 'See all vendors'  : 'جميع البائعين';

  return (
    <section className="bg-[#0A1628] py-0" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <div className="bg-[#112240] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-base md:text-lg font-bold text-white">{title}</h2>
            <button className="text-primary text-sm hover:underline" data-testid="button-see-all-vendors">
              {viewAll}
            </button>
          </div>

          {/* Vendor row */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5 rtl:divide-x-reverse"
          >
            {vendors.map((vendor) => (
              <motion.div key={vendor.id} variants={item} className="p-5 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-4 rtl:flex-row-reverse">
                  {/* Avatar / store image */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-[#0A1628]">
                    <img
                      src={vendor.image}
                      alt={vendor.name[lang]}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm mb-0.5 truncate">
                      {vendor.name[lang]}
                    </h3>

                    <div className="flex items-center gap-1 mb-1.5">
                      <ShieldCheck className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-primary text-[10px] font-semibold">{verified}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-white/60 mb-3">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        <span className="text-white font-medium">{vendor.rating}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        <span className="text-white font-medium">{vendor.productCount}</span>
                        <span>{products}</span>
                      </span>
                    </div>

                    <button
                      className="w-full border border-primary/40 text-primary text-xs font-semibold py-1.5 rounded hover:bg-primary hover:text-[#0A1628] transition-colors"
                      data-testid={`button-visit-store-${vendor.id}`}
                    >
                      {visitStore}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
