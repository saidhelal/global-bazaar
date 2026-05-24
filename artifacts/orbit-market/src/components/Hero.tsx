import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function Hero() {
  const { t, lang, dir } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero-bg.png" 
          alt="Luxury Ecommerce" 
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            // Fallback if generated image isn't ready
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-background/50 to-background" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium tracking-wide uppercase backdrop-blur-sm">
            {lang === 'en' ? 'Welcome to Orbit' : 'مرحباً بك في أوربت'}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1]">
            {t('hero.headline')}
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtext')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-semibold rounded-full group" data-testid="button-shop-now">
              {t('hero.shopNow')}
              <ArrowIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 rtl:mr-2 rtl:ml-0" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 border-white/20 text-white hover:bg-white/10 text-lg font-semibold rounded-full" data-testid="button-explore-vendors">
              {t('hero.exploreVendors')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
