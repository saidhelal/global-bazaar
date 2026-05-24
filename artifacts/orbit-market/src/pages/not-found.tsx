import { useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { lang, dir } = useLanguage();

  const tx = lang === 'ar'
    ? { code: '٤٠٤', title: 'الصفحة غير موجودة', sub: 'يبدو أن هذه الصفحة انتقلت إلى مدار آخر.', home: 'العودة للرئيسية', shop: 'تصفح المنتجات' }
    : { code: '404', title: 'Page Not Found', sub: 'Looks like this page drifted into another orbit.', home: 'Back to Home', shop: 'Browse Products' };

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-[#112240] border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-6">
            <SearchX className="w-12 h-12 text-[#D4AF37]/60" />
          </div>
          <p className="text-[#D4AF37] font-black text-7xl mb-3 tracking-tight">{tx.code}</p>
          <h1 className="text-white text-2xl font-bold mb-3">{tx.title}</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">{tx.sub}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setLocation('/')}
              className="px-6 py-2.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-lg hover:bg-[#D4AF37]/90 transition-colors text-sm"
            >
              {tx.home}
            </button>
            <button
              onClick={() => setLocation('/products')}
              className="px-6 py-2.5 border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-semibold rounded-lg transition-colors text-sm"
            >
              {tx.shop}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
