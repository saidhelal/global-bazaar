import { useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Send, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'wouter';

export default function Footer() {
  const { lang, dir } = useLanguage();
  const [email, setEmail] = useState('');

  const backToTop = lang === 'en' ? 'Back to top' : 'العودة للأعلى';
  const copyright = lang === 'en' ? '© 2024 Orbit Market, Inc.' : '© 2024 سوق أوربت';
  const privacyLabel = lang === 'en' ? 'Privacy Notice' : 'سياسة الخصوصية';
  const termsLabel   = lang === 'en' ? 'Conditions of Use' : 'شروط الاستخدام';
  const cookieLabel  = lang === 'en' ? 'Cookie Preferences' : 'تفضيلات الكوكيز';

  const columns = [
    {
      title: lang === 'en' ? 'About Orbit Market' : 'عن سوق أوربت',
      links: lang === 'en'
        ? ['About Us', 'Careers', 'Press', 'Investor Relations', 'Sustainability']
        : ['من نحن', 'الوظائف', 'الصحافة', 'علاقات المستثمرين', 'الاستدامة'],
    },
    {
      title: lang === 'en' ? 'Customer Service' : 'خدمة العملاء',
      links: lang === 'en'
        ? ['Contact Us', 'Shipping & Returns', 'FAQ', 'Track Order', 'Help Center']
        : ['اتصل بنا', 'الشحن والإرجاع', 'الأسئلة الشائعة', 'تتبع الطلب', 'مركز المساعدة'],
    },
    {
      title: lang === 'en' ? 'Make Money with Us' : 'اكسب المال معنا',
      links: lang === 'en'
        ? ['Sell Products', 'Become an Affiliate', 'Advertise', 'Vendor Hub', 'Partner Program']
        : ['بيع منتجاتك', 'كن شريكاً', 'الإعلان', 'مركز البائعين', 'برنامج الشراكة'],
    },
    {
      title: lang === 'en' ? 'Payment Products' : 'منتجات الدفع',
      links: lang === 'en'
        ? ['Orbit Credit Card', 'Shop with Points', 'Reload Balance', 'Currency Converter', 'Gift Cards']
        : ['بطاقة أوربت الائتمانية', 'التسوق بالنقاط', 'إعادة تعبئة الرصيد', 'محول العملات', 'بطاقات الهدايا'],
    },
  ];

  const newsletterTitle = lang === 'en' ? 'Stay connected' : 'ابق على تواصل';
  const newsletterSub   = lang === 'en'
    ? 'Subscribe for exclusive deals and updates.'
    : 'اشترك للحصول على عروض حصرية وتحديثات.';
  const placeholder = lang === 'en' ? 'Enter your email' : 'أدخل بريدك الإلكتروني';
  const subscribeLbl = lang === 'en' ? 'Subscribe' : 'اشتراك';

  return (
    <footer dir={dir}>
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full bg-[#1D3461] hover:bg-[#243f72] text-white text-sm font-medium py-3 flex items-center justify-center gap-2 transition-colors border-t border-white/5"
        data-testid="button-back-to-top"
      >
        <ChevronUp className="w-4 h-4" />
        {backToTop}
      </button>

      {/* Main footer */}
      <div className="bg-[#112240] pt-10 pb-6 border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          {/* Four-column link grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-white/55 text-xs hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter + socials */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Newsletter */}
            <div className="flex-1 max-w-sm">
              <h4 className="text-white font-bold text-sm mb-1">{newsletterTitle}</h4>
              <p className="text-white/50 text-xs mb-3">{newsletterSub}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white text-xs px-3 py-2 rounded outline-none placeholder-white/30 transition-colors"
                  dir={dir}
                  data-testid="input-newsletter-email"
                />
                <button
                  className="bg-primary text-[#0A1628] font-bold text-xs px-4 py-2 rounded hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  data-testid="button-newsletter-subscribe"
                >
                  <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                  {subscribeLbl}
                </button>
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-3">
              {[
                { Icon: Facebook, label: 'Facebook' },
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Twitter, label: 'Twitter' },
                { Icon: Youtube, label: 'YouTube' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#0A1628] border-t border-white/5 py-4">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#0A1628]" />
            </div>
            <span className="text-white/70 text-xs font-bold tracking-widest uppercase group-hover:text-white transition-colors">
              {lang === 'en' ? 'Orbit Market' : 'سوق أوربت'}
            </span>
          </Link>

          {/* Legal links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {[privacyLabel, termsLabel, cookieLabel].map((lbl) => (
              <a key={lbl} href="#" className="text-white/40 text-[11px] hover:text-white/70 transition-colors">
                {lbl}
              </a>
            ))}
          </div>

          <p className="text-white/30 text-[11px]">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
