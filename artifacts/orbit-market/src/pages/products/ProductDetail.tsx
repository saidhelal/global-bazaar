import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ShoppingCart, Star, Minus, Plus, ArrowLeft, Package, Shield, RotateCcw, Truck } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import ProductReviews from '../../components/ProductReviews';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { apiFetch } from '../../contexts/AuthContext';
import type { Product } from '../../hooks/useProducts';

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/600/600';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { lang, dir } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem, isInCart, getQuantity, updateQuantity } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs'>('desc');
  const [addedEffect, setAddedEffect] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/products/${id}`)
      .then(d => {
        setProduct(d.product);
        setActiveImg(0);
        // Fetch related
        return apiFetch(`/products?category=${encodeURIComponent(d.product.category)}&limit=8`);
      })
      .then(d => setRelated((d.products || []).filter((p: Product) => p.id !== parseInt(id!)).slice(0, 4)))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628]" dir={dir}>
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
          <div className="bg-[#112240] rounded-2xl aspect-square" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-6 bg-[#112240] rounded" style={{ width: `${90 - i * 10}%` }} />)}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Package className="w-16 h-16 text-white/20" />
          <h2 className="text-white text-xl font-semibold">Product not found</h2>
          <button onClick={() => setLocation('/products')} className="text-[#D4AF37] underline">Browse all products</button>
        </div>
        <Footer />
      </div>
    );
  }

  const title = (lang === 'ar' && product.titleAr) ? product.titleAr : product.title;
  const desc = (lang === 'ar' && product.descriptionAr) ? product.descriptionAr : product.description;
  const price = parseFloat(product.price);
  const compareAt = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
  const images = (product.images && product.images.length > 0) ? product.images : [product.coverImage].filter(Boolean) as string[];
  const inCart = isInCart(product.id);
  const cartQty = getQuantity(product.id);
  const rating = parseFloat(product.rating || '0');

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) {
      addItem({ productId: product!.id, title: product!.title, titleAr: product!.titleAr, price, image: product!.coverImage, vendorId: product!.vendorId, stock: product!.stock });
    }
    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 1500);
  }

  function handleBuyNow() {
    if (!inCart) handleAddToCart();
    setLocation('/checkout');
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-white/40 text-sm mb-6">
          <button onClick={() => setLocation('/')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => setLocation('/products')} className="hover:text-white transition-colors">Products</button>
          <span>/</span>
          <button onClick={() => setLocation(`/products?category=${product.category}`)} className="hover:text-white transition-colors">{product.category}</button>
          <span>/</span>
          <span className="text-white/70 truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Image gallery */}
          <div className="space-y-3">
            <div className="aspect-square bg-[#112240] rounded-2xl overflow-hidden border border-white/5">
              <img
                src={getImgUrl(images[activeImg])}
                alt={title}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/600/600'; }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === activeImg ? 'border-[#D4AF37]' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <img src={getImgUrl(img)} alt="" className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/thumb/64/64'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            <div>
              <span className="text-[#D4AF37]/70 text-xs uppercase tracking-widest">{product.category}</span>
              <h1 className="text-white text-2xl font-bold mt-1 leading-snug">{title}</h1>
              {product.sku && <p className="text-white/30 text-xs mt-1">SKU: {product.sku}</p>}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-5 h-5 ${i <= Math.round(rating) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-white/20'}`} />
                ))}
              </div>
              <span className="text-white/60 text-sm">{rating.toFixed(1)} ({product.reviewCount || 0} reviews)</span>
              <span className="text-white/20">|</span>
              <span className="text-green-400 text-sm">{product.salesCount || 0} sold</span>
            </div>

            {/* Price */}
            <div className="bg-[#112240] rounded-xl p-4 border border-white/5">
              <div className="flex items-baseline gap-3">
                <span className="text-[#D4AF37] text-3xl font-bold">{formatPrice(price)}</span>
                {compareAt && <span className="text-white/30 text-lg line-through">{formatPrice(compareAt)}</span>}
                {product.discountPercent && product.discountPercent > 0 ? (
                  <span className="bg-[#D4AF37] text-[#0A1628] text-xs font-bold px-2 py-0.5 rounded">Save {product.discountPercent}%</span>
                ) : null}
              </div>
              <p className="text-green-400 text-sm mt-1.5">✓ {lang === 'ar' ? `شحن مجاني للطلبات فوق ${formatPrice(100)}` : `Free shipping on orders over ${formatPrice(100)}`}</p>
            </div>

            {/* Stock */}
            <div>
              {product.stock > 0 ? (
                <p className="text-green-400 text-sm font-medium">
                  ✓ In Stock {product.stock <= (product.lowStockThreshold ?? 5) ? `(Only ${product.stock} left!)` : ''}
                </p>
              ) : (
                <p className="text-red-400 text-sm font-medium">✗ Out of Stock</p>
              )}
            </div>

            {/* Quantity + cart */}
            {product.stock > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-white/60 text-sm">{lang === 'ar' ? 'الكمية' : 'Quantity'}</span>
                  <div className="flex items-center gap-2 bg-[#112240] border border-white/10 rounded-lg">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-semibold w-8 text-center">{qty}</span>
                    <button
                      onClick={() => setQty(Math.min(product.stock, qty + 1))}
                      className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {inCart && <span className="text-[#D4AF37] text-sm">{cartQty} in cart</span>}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      addedEffect ? 'bg-green-500 text-white' : 'bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {addedEffect ? '✓ Added!' : inCart ? 'Add More' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 py-3 bg-[#1D3461] hover:bg-[#1D3461]/80 text-white border border-[#D4AF37]/30 rounded-xl font-semibold transition-all"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map(t => (
                  <span key={t} className="bg-white/5 text-white/50 border border-white/10 text-xs px-3 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Truck, label: 'Free Shipping', sub: 'On orders over $100' },
                { icon: RotateCcw, label: 'Easy Returns', sub: '30-day return policy' },
                { icon: Shield, label: 'Buyer Protection', sub: '100% secure checkout' },
                { icon: Package, label: 'Quality Assured', sub: 'Verified vendors only' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-2 bg-[#112240]/60 rounded-lg p-2.5 border border-white/5">
                  <Icon className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <p className="text-white/40 text-[10px]">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description tabs */}
        {desc && (
          <div className="mb-12 bg-[#112240] rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex border-b border-white/5">
              {[{ key: 'desc', label: 'Description' }, { key: 'specs', label: 'Specifications' }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`px-6 py-3 text-sm font-semibold transition-colors ${activeTab === t.key ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-white/50 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-6 text-white/70 text-sm leading-relaxed" dir={lang === 'ar' && product.descriptionAr ? 'rtl' : 'ltr'}>
              {desc}
            </div>
          </div>
        )}

        {/* Reviews section */}
        <div className="mb-12">
          <ProductReviews productId={product.id} vendorId={product.vendorId} />
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div>
            <h2 className="text-white font-bold text-xl mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
