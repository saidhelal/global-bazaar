import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { products } from '../data/products';
import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function FeaturedProducts() {
  const { t, lang, dir } = useLanguage();

  return (
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {t('featured.title')}
          </h2>
          <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
            {t('common.viewAll')}
          </Button>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={item}>
              <Card className="h-full bg-card border-card-border overflow-hidden group">
                <div className="relative aspect-[4/5] overflow-hidden bg-background/50">
                  {/* Badges */}
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    {product.id % 3 === 0 && (
                      <Badge className="bg-primary text-primary-foreground">{t('featured.new')}</Badge>
                    )}
                  </div>
                  
                  {/* Wishlist */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-background/50 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-red-500 hover:bg-background"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>

                  {/* Image */}
                  <img 
                    src={product.image} 
                    alt={product.name[lang]}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  
                  {/* Quick Add overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <Button className="w-full bg-white/90 backdrop-blur-md text-black hover:bg-primary hover:text-primary-foreground font-semibold">
                      <ShoppingBag className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                      {t('common.addToCart')}
                    </Button>
                  </div>
                </div>

                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-semibold text-white line-clamp-1 flex-1" title={product.name[lang]}>
                      {product.name[lang]}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{product.vendor}</p>
                  
                  <div className="flex items-center gap-1 mb-4">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-sm font-medium text-white">{product.rating}</span>
                    <span className="text-sm text-muted-foreground ml-1 rtl:ml-0 rtl:mr-1">(128)</span>
                  </div>
                </CardContent>

                <CardFooter className="p-5 pt-0 flex justify-between items-end border-t border-white/5 mt-auto pt-4">
                  <div>
                    <p className="text-lg font-bold text-primary">
                      ${product.priceUSD.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.priceSAR.toFixed(2)} SAR
                    </p>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
