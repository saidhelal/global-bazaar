import { Smartphone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';

export default function PromoBanner() {
  const { t } = useLanguage();

  return (
    <section className="py-12 bg-background px-4">
      <div className="container mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#D4AF37] to-[#8C7323] p-1">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
          
          <div className="relative bg-[#0A1628]/95 backdrop-blur-sm rounded-[22px] px-8 py-16 md:px-16 flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="relative z-10 flex-1 text-center md:text-start rtl:md:text-right">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                {t('promo.title')}
              </h2>
              <p className="text-lg md:text-xl text-white/80 max-w-xl mb-8">
                {t('promo.subtext')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button size="lg" className="bg-primary text-[#0A1628] hover:bg-primary/90 font-bold h-14 px-8 rounded-xl text-lg">
                  <Smartphone className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t('promo.downloadBtn')}
                </Button>
              </div>
            </div>
            
            <div className="relative z-10 w-full md:w-1/3 flex justify-center">
              {/* Abstract phone mockup */}
              <div className="w-64 h-[400px] bg-[#0A1628] rounded-[3rem] border-[8px] border-[#D4AF37] shadow-2xl relative overflow-hidden -mb-32">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#D4AF37] rounded-full"></div>
                <div className="mt-16 mx-4 space-y-4">
                  <div className="w-full h-32 bg-white/5 rounded-2xl"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-white/5 rounded-xl"></div>
                    <div className="h-24 bg-white/5 rounded-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
