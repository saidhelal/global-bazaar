import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import { vendors } from '../data/vendors';
import { Star, ShieldCheck, Package, ArrowRight, Store } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function VendorSpotlight() {
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <section className="py-2" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <div className="bg-[#0D1E3C] rounded-2xl overflow-hidden border border-white/[0.07]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center">
                <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
              </div>
              <h2 className="text-white font-bold text-base md:text-lg">
                {lang === 'ar' ? 'أبرز البائعين' : 'Top Vendors'}
              </h2>
            </div>
            <button
              className="flex items-center gap-1 text-[#D4AF37] text-sm font-semibold hover:underline"
              data-testid="button-see-all-vendors"
            >
              {lang === 'ar' ? 'جميع البائعين' : 'See all vendors'}
              <ArrowRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Vendor cards */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.05] rtl:divide-x-reverse"
          >
            {vendors.map(vendor => (
              <motion.div
                key={vendor.id}
                variants={item}
                className="p-5 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#050E1F] shadow-lg">
                      <img
                        src={vendor.image}
                        alt={vendor.name[lang]}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    {/* Verified badge */}
                    <div className="absolute -bottom-1 -right-1 rtl:-right-auto rtl:-left-1 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center shadow">
                      <ShieldCheck className="w-3 h-3 text-[#050E1F]" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm mb-0.5 truncate">
                      {vendor.name[lang]}
                    </h3>

                    <p className="text-[#D4AF37] text-[10px] font-semibold mb-2">
                      {lang === 'ar' ? '✦ بائع معتمد' : '✦ Verified Vendor'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                        <span className="text-white font-semibold text-xs">{vendor.rating}</span>
                      </div>
                      <div className="w-px h-3 bg-white/10" />
                      <div className="flex items-center gap-1 text-white/50 text-xs">
                        <Package className="w-3 h-3" />
                        <span className="text-white font-medium">{vendor.productCount}</span>
                        <span>{lang === 'ar' ? 'منتج' : 'products'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setLocation('/products')}
                      className="w-full border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold py-2 rounded-xl hover:bg-[#D4AF37] hover:text-[#050E1F] hover:border-[#D4AF37] transition-all duration-200"
                      data-testid={`button-visit-store-${vendor.id}`}
                    >
                      {lang === 'ar' ? 'زيارة المتجر' : 'Visit Store'}
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
