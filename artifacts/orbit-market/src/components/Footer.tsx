import { Facebook, Instagram, Twitter, Youtube, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Link } from 'wouter';

export default function Footer() {
  const { t, lang } = useLanguage();

  return (
    <footer className="bg-[#050B14] text-white/70 pt-20 pb-10 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <div className="w-4 h-4 rounded-full border-2 border-[#050B14]"></div>
              </div>
              <span className="text-2xl font-bold tracking-tight text-white uppercase">
                {lang === 'en' ? 'Orbit Market' : 'سوق أوربت'}
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-muted-foreground">
              {lang === 'en' 
                ? 'The premier global destination for luxury goods and verified premium vendors.' 
                : 'الوجهة العالمية الأولى للسلع الفاخرة والبائعين المعتمدين المتميزين.'}
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-[#050B14] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-[#050B14] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-[#050B14] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-[#050B14] transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider">{t('footer.about')}</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-primary transition-colors">Our Story</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Press</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sustainability</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider">{t('footer.customerService')}</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Track Order</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider">{t('footer.newsletter')}</h4>
            <p className="text-sm mb-4 text-muted-foreground">
              {lang === 'en' 
                ? 'Subscribe to receive updates, access to exclusive deals, and more.' 
                : 'اشترك لتلقي التحديثات والوصول إلى العروض الحصرية والمزيد.'}
            </p>
            <div className="flex gap-2">
              <Input 
                type="email" 
                placeholder={t('footer.emailPlaceholder')}
                className="bg-white/5 border-white/10 focus-visible:ring-primary text-white"
              />
              <Button size="icon" className="bg-primary text-[#050B14] hover:bg-primary/90 shrink-0">
                <Send className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{t('footer.copyright')}</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
