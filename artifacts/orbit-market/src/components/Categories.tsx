import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { categories } from '../data/categories';
import { Card, CardContent } from './ui/card';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function Categories() {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {t('categories.title')}
          </h2>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {categories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <motion.div key={cat.id} variants={item}>
                <Card className="group cursor-pointer bg-card border-card-border hover:border-primary/50 transition-colors duration-300">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-background border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">
                      <Icon className="w-8 h-8 text-white group-hover:text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
                        {t(`categories.${cat.id}`)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {cat.count.toLocaleString()} {t('categories.items')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
