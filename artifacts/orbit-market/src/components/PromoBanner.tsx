import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Smartphone, Apple } from 'lucide-react';

export default function PromoBanner() {
  const { lang, dir } = useLanguage();

  const title     = lang === 'en' ? 'Get the Orbit Market App'                          : 'احصل على تطبيق سوق أوربت';
  const subtext   = lang === 'en' ? 'Shop anytime, anywhere. Exclusive app deals daily.' : 'تسوق في أي وقت ومن أي مكان. عروض حصرية عبر التطبيق يومياً.';
  const badge1sub = lang === 'en' ? 'Download on the' : 'حمّل من';
  const badge2sub = lang === 'en' ? 'Get it on'       : 'احصل عليه من';
  const qrLabel   = lang === 'en' ? 'Scan to download' : 'امسح للتحميل';

  return (
    <section className="bg-[#0A1628] py-0" dir={dir}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-lg overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #112240 0%, #1D3461 50%, #112240 100%)',
            borderTop: '2px solid #D4AF37',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 md:px-12 py-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg md:text-xl mb-1">{title}</h3>
                <p className="text-white/60 text-sm max-w-xs">{subtext}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="hidden lg:flex flex-col items-center gap-1">
                <div className="w-16 h-16 bg-white rounded p-1.5">
                  <div className="w-full h-full grid grid-cols-5 gap-px">
                    {[...Array(25)].map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${[0,1,2,5,10,12,14,19,22,23,24,7,17].includes(i) ? 'bg-[#0A1628]' : 'bg-transparent'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-white/40 text-[10px]">{qrLabel}</span>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  className="flex items-center gap-3 bg-[#0A1628] border border-white/20 hover:border-primary/60 px-5 py-2.5 rounded-lg transition-colors group"
                  data-testid="button-download-ios"
                >
                  <Apple className="w-5 h-5 text-white group-hover:text-primary transition-colors" />
                  <div className="text-left rtl:text-right">
                    <p className="text-white/50 text-[10px] leading-none">{badge1sub}</p>
                    <p className="text-white font-semibold text-sm leading-tight">App Store</p>
                  </div>
                </button>

                <button
                  className="flex items-center gap-3 bg-[#0A1628] border border-white/20 hover:border-primary/60 px-5 py-2.5 rounded-lg transition-colors group"
                  data-testid="button-download-android"
                >
                  <Smartphone className="w-5 h-5 text-white group-hover:text-primary transition-colors" />
                  <div className="text-left rtl:text-right">
                    <p className="text-white/50 text-[10px] leading-none">{badge2sub}</p>
                    <p className="text-white font-semibold text-sm leading-tight">Google Play</p>
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
