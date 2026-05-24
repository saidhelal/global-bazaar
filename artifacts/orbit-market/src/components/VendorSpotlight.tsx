import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { vendors } from '../data/vendors';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Star, Store } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

export default function VendorSpotlight() {
  const { t, lang } = useLanguage();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            {t('vendors.title')}
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {vendors.map((vendor) => (
            <motion.div key={vendor.id} variants={item}>
              <Card className="bg-card border-card-border overflow-hidden relative group">
                <div className="h-32 w-full relative">
                  <img 
                    src={vendor.image} 
                    alt={vendor.name[lang]} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
                
                <CardContent className="relative px-6 pb-6 pt-0 sm:px-8">
                  <div className="flex justify-center -mt-12 mb-4 relative z-10">
                    <Avatar className="w-24 h-24 border-4 border-card bg-background">
                      <AvatarImage src={vendor.image} alt={vendor.name[lang]} />
                      <AvatarFallback><Store className="w-10 h-10 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">{vendor.name[lang]}</h3>
                    
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span className="text-white font-medium">{vendor.rating}</span>
                        <span>{t('vendors.rating')}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-white/20"></div>
                      <div>
                        <span className="text-white font-medium mr-1 rtl:mr-0 rtl:ml-1">{vendor.productCount}</span>
                        {t('vendors.products')}
                      </div>
                    </div>
                    
                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                      {t('common.visitStore')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
