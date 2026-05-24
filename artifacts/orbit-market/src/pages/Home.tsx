import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import FeaturedProducts from '../components/FeaturedProducts';
import VendorSpotlight from '../components/VendorSpotlight';
import PromoBanner from '../components/PromoBanner';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1">
        <Hero />
        <Categories />
        <FeaturedProducts />
        <PromoBanner />
        <VendorSpotlight />
      </main>
      <Footer />
    </div>
  );
}
