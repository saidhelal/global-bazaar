import { useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Send, ChevronUp, ShieldCheck, Truck, RotateCcw, HeadphonesIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'wouter';

const trustItems = [
  { Icon: Truck,           en: 'Free Delivery',    ar: 'توصيل مجاني',     sub: { en: 'Orders over $100', ar: 'للطلبات فوق 100$' } },
  { Icon: ShieldCheck,     en: 'Secure Payment',   ar: 'دفع آمن',          sub: { en: '256-bit encryption', ar: 'تشفير 256 بت' } },
  { Icon: RotateCcw,       en: '30-Day Returns',   ar: 'إرجاع 30 يوم',    sub: { en: 'Hassle-free returns', ar: 'إرجاع بلا متاعب' } },
  { Icon: HeadphonesIcon,  en: '24/7 Support',     ar: 'دعم 24/7',         sub: { en: 'Always here to help', ar: 'دائماً لمساعدتك' } },
];

export default function Footer() {
  const { lang, dir } = useLanguage();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

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
      title: lang === 'en' ? 'Sell with Us' : 'البيع معنا',
      links: lang === 'en'
        ? ['Sell Products', 'Become an Affiliate', 'Advertise', 'Vendor Hub', 'Partner Program']
        : ['بيع منتجاتك', 'كن شريكاً', 'الإعلان', 'مركز البائعين', 'برنامج الشراكة'],
    },
    {
      title: lang === 'en' ? 'Payment & Wallet' : 'الدفع والمحفظة',
      links: lang === 'en'
        ? ['Orbit Credit Card', 'Shop with Points', 'Reload Balance', 'Gift Cards', 'Currency Converter']
        : ['بطاقة أوربت الائتمانية', 'التسوق بالنقاط', 'إعادة تعبئة الرصيد', 'بطاقات الهدايا', 'محول العملات'],
    },
  ];

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email) { setSubscribed(true); }
  }

  return (
    <footer dir={dir} className="mt-4">
      {/* Trust strip */}
      <div className="bg-[#0D1E3C] border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.05] rtl:divide-x-reverse">
            {trustItems.map(({ Icon, en, ar, sub }) => (
              <div key={en} className="flex items-center gap-3 px-4 py-4 md:py-5">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0 border border-[#D4AF37]/15">
                  <Icon className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-bold truncate">{lang === 'ar' ? ar : en}</p>
                  <p className="text-white/35 text-[10px] truncate">{lang === 'ar' ? sub.ar : sub.en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full bg-[#112240] hover:bg-[#1a2f52] text-white/70 hover:text-white text-sm font-medium py-3 flex items-center justify-center gap-2 transition-all border-t border-white/[0.06] group"
        data-testid="button-back-to-top"
      >
        <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
        {lang === 'ar' ? 'العودة للأعلى' : 'Back to top'}
      </button>

      {/* Main footer body */}
      <div className="bg-[#0A1628] pt-10 pb-6 border-t border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">

          {/* Logo + tagline */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#0A1628]" />
            </div>
            <div>
              <span className="text-white font-extrabold text-base tracking-tight block leading-none">
                {lang === 'en' ? 'orbit' : 'أوربت'}
              </span>
              <span className="text-[#D4AF37] text-[9px] font-bold tracking-[0.25em] uppercase block leading-none">
                {lang === 'en' ? 'market' : 'ماركت'}
              </span>
            </div>
          </div>

          {/* Four-column links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {columns.map(col => (
              <div key={col.title}>
                <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-white/45 text-xs hover:text-white/80 hover:translate-x-0.5 rtl:hover:-translate-x-0.5 inline-block transition-all">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter + socials */}
          <div className="border-t border-white/[0.07] pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Newsletter */}
            <div className="flex-1 max-w-sm">
              <h4 className="text-white font-bold text-sm mb-0.5">
                {lang === 'ar' ? 'ابق على تواصل' : 'Stay Connected'}
              </h4>
              <p className="text-white/40 text-xs mb-3">
                {lang === 'ar'
                  ? 'اشترك للحصول على عروض حصرية وتحديثات.'
                  : 'Subscribe for exclusive deals and early access.'}
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                  <span>✓</span>
                  <span>{lang === 'ar' ? 'شكراً! تم الاشتراك.' : 'Thanks! You\'re subscribed.'}</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    className="flex-1 bg-[#112240] border border-white/10 focus:border-[#D4AF37]/40 text-white text-xs px-3 py-2.5 rounded-xl outline-none placeholder-white/25 transition-colors"
                    dir={dir}
                    data-testid="input-newsletter-email"
                  />
                  <button
                    type="submit"
                    className="bg-[#D4AF37] text-[#050E1F] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#c9a432] transition-colors flex items-center gap-1.5 flex-shrink-0"
                    data-testid="button-newsletter-subscribe"
                  >
                    <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                    {lang === 'ar' ? 'اشتراك' : 'Subscribe'}
                  </button>
                </form>
              )}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2.5">
              {[
                { Icon: Instagram, label: 'Instagram', color: 'hover:text-pink-400 hover:border-pink-400/30' },
                { Icon: Twitter,   label: 'Twitter',   color: 'hover:text-sky-400 hover:border-sky-400/30' },
                { Icon: Facebook,  label: 'Facebook',  color: 'hover:text-blue-400 hover:border-blue-400/30' },
                { Icon: Youtube,   label: 'YouTube',   color: 'hover:text-red-400 hover:border-red-400/30' },
              ].map(({ Icon, label, color }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className={`w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40 transition-all ${color} hover:bg-white/[0.08] hover:scale-105`}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          <div className="mt-8 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span className="text-white/25 text-[10px]">{lang === 'ar' ? 'طرق الدفع المقبولة:' : 'Accepted payments:'}</span>
              {['Visa', 'MC', 'PayPal', 'Apple Pay', 'STC Pay', 'Mada'].map(m => (
                <span key={m} className="bg-white/[0.05] border border-white/[0.08] text-white/40 text-[9px] font-bold px-2 py-0.5 rounded">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#050E1F] border-t border-white/[0.05] py-4">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-[11px]">
            {lang === 'ar' ? '© 2025 سوق أوربت. جميع الحقوق محفوظة.' : '© 2025 Orbit Market, Inc. All rights reserved.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {[
              lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Notice',
              lang === 'ar' ? 'شروط الاستخدام' : 'Conditions of Use',
              lang === 'ar' ? 'تفضيلات الكوكيز' : 'Cookie Preferences',
              lang === 'ar' ? 'إمكانية الوصول' : 'Accessibility',
            ].map(lbl => (
              <a key={lbl} href="#" className="text-white/30 text-[11px] hover:text-white/60 transition-colors">
                {lbl}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
