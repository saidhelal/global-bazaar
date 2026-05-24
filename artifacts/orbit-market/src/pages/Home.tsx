import Header from '../components/Header';
import Hero from '../components/Hero';
import DealsSection from '../components/DealsSection';
import Categories from '../components/Categories';
import CategorySection from '../components/CategorySection';
import FeaturedProducts from '../components/FeaturedProducts';
import VendorSpotlight from '../components/VendorSpotlight';
import PromoBanner from '../components/PromoBanner';
import Footer from '../components/Footer';
import { CATEGORIES } from '../data/categories';

const HOME_CATEGORY_SECTIONS = ['Fashion', 'Electronics', 'Beauty & Personal Care', 'Home & Kitchen', 'Sports & Fitness', 'Toys & Games & Hobbies'];

export default function Home() {
  const sectionCats = CATEGORIES.filter(c => HOME_CATEGORY_SECTIONS.includes(c.value));

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex flex-col gap-0 pb-4">
        <Hero />
        <DealsSection />

        {/* Department grid */}
        <Categories />

        <div className="max-w-[1400px] mx-auto w-full px-3 md:px-6">
          <div className="border-t border-white/5 my-2" />
        </div>

        {/* Per-category product carousels */}
        {sectionCats.map((cat, idx) => (
          <div key={cat.value} className={idx % 2 === 1 ? 'bg-[#071020]' : ''}>
            <CategorySection category={cat} />
          </div>
        ))}

        <FeaturedProducts />
        <VendorSpotlight />
        <PromoBanner />
      </main>
      <Footer />
    </div>
  );
}
