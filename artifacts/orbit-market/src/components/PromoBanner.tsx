import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Smartphone, Apple, Star, Download } from 'lucide-react';

const appRating = { score: '4.9', reviews: '128K' };

export default function PromoBanner() {
  const { lang, dir } = useLanguage();

  return (
    <section className="py-4" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/15"
          style={{ background: 'linear-gradient(135deg, #071020 0%, #0D1E3C 40%, #122445 60%, #071020 100%)' }}
        >
          {/* Decorative gold line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />

          {/* Background orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#D4AF37]/[0.03] blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 px-6 md:px-12 py-8 md:py-10">

            {/* Left: Text content */}
            <div className="flex items-center gap-5 flex-1">
              {/* App icon */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex-shrink-0 flex items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg, #1D3461, #112240)', border: '1px solid rgba(212,175,55,0.25)' }}>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-transparent" />
                <Smartphone className="w-8 h-8 md:w-10 md:h-10 text-[#D4AF37] relative z-10" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#D4AF37] text-[10px] font-bold tracking-widest uppercase">
                    {lang === 'ar' ? 'التطبيق الرسمي' : 'Official App'}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg md:text-xl mb-1.5">
                  {lang === 'ar' ? 'احصل على تطبيق سوق أوربت' : 'Get the Orbit Market App'}
                </h3>
                <p className="text-white/55 text-sm max-w-xs leading-relaxed">
                  {lang === 'ar'
                    ? 'تسوق في أي وقت ومن أي مكان. عروض حصرية عبر التطبيق يومياً.'
                    : 'Shop anytime, anywhere. Exclusive app-only deals every day.'}
                </p>

                {/* App rating */}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />)}
                  </div>
                  <span className="text-white font-bold text-xs">{appRating.score}</span>
                  <span className="text-white/40 text-xs">({appRating.reviews} {lang === 'ar' ? 'تقييم' : 'reviews'})</span>
                </div>
              </div>
            </div>

            {/* Right: Download buttons */}
            <div className="flex items-center gap-5 flex-shrink-0">
              {/* QR code placeholder */}
              <div className="hidden lg:flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-white rounded-xl p-2 flex-shrink-0">
                  <div className="w-full h-full grid grid-cols-6 gap-[1px]">
                    {[...Array(36)].map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${[0,1,2,6,7,8,12,13,14,3,9,15,5,11,17,21,22,23,27,28,29,33,34,35,18,24,30,20,26,32].includes(i) ? 'bg-[#050E1F]' : 'bg-transparent'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-white/35 text-[10px] flex items-center gap-1">
                  <Download className="w-2.5 h-2.5" />
                  {lang === 'ar' ? 'امسح للتحميل' : 'Scan to download'}
                </span>
              </div>

              {/* Store buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  className="flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 hover:border-[#D4AF37]/40 px-5 py-3 rounded-xl transition-all duration-200 group min-w-[160px]"
                  data-testid="button-download-ios"
                >
                  <Apple className="w-5 h-5 text-white group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                  <div className="text-left rtl:text-right">
                    <p className="text-white/45 text-[10px] leading-none mb-0.5">{lang === 'ar' ? 'حمّل من' : 'Download on the'}</p>
                    <p className="text-white font-bold text-sm leading-tight">App Store</p>
                  </div>
                </button>

                <button
                  className="flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 hover:border-[#D4AF37]/40 px-5 py-3 rounded-xl transition-all duration-200 group min-w-[160px]"
                  data-testid="button-download-android"
                >
                  <Smartphone className="w-5 h-5 text-white group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                  <div className="text-left rtl:text-right">
                    <p className="text-white/45 text-[10px] leading-none mb-0.5">{lang === 'ar' ? 'احصل عليه من' : 'Get it on'}</p>
                    <p className="text-white font-bold text-sm leading-tight">Google Play</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
