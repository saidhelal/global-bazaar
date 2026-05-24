import Header from '../components/Header';
import Hero from '../components/Hero';
import DealsSection from '../components/DealsSection';
import Categories from '../components/Categories';
import FeaturedProducts from '../components/FeaturedProducts';
import VendorSpotlight from '../components/VendorSpotlight';
import PromoBanner from '../components/PromoBanner';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex flex-col gap-3 pb-3">
        <Hero />
        <DealsSection />
        <Categories />
        <FeaturedProducts />
        <VendorSpotlight />
        <PromoBanner />
      </main>
      <Footer />
    </div>
  );
}
