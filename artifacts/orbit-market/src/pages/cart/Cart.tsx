import { Link, useLocation } from 'wouter';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/80/80';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

export default function Cart() {
  const { items, count, subtotal, removeItem, updateQuantity, clearCart } = useCart();
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();

  const shipping = subtotal >= 100 ? 0 : 9.99;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-24 h-24 rounded-full bg-[#112240] border border-white/10 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-white/20" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-3">
              {lang === 'ar' ? 'سلة التسوق فارغة' : 'Your cart is empty'}
            </h2>
            <p className="text-white/40 mb-8">
              {lang === 'ar' ? 'تصفح منتجاتنا وأضف ما يعجبك' : 'Browse our products and add items you love'}
            </p>
            <Link href="/products">
              <button className="px-8 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors">
                {lang === 'ar' ? 'تسوق الآن' : 'Start Shopping'}
              </button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white font-bold text-2xl">
            {lang === 'ar' ? 'سلة التسوق' : 'Shopping Cart'}
            <span className="text-white/40 font-normal text-lg ml-2 rtl:mr-2 rtl:ml-0">({count} items)</span>
          </h1>
          <button onClick={clearCart} className="text-red-400/70 hover:text-red-400 text-sm flex items-center gap-1.5 transition-colors">
            <Trash2 className="w-4 h-4" />
            {lang === 'ar' ? 'إفراغ السلة' : 'Clear cart'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item.productId} className="bg-[#112240] border border-white/5 rounded-xl p-4 flex gap-4 hover:border-white/10 transition-colors">
                <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                  <img
                    src={getImgUrl(item.image)}
                    alt={item.title}
                    className="w-20 h-20 rounded-lg object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/item/80/80'; }}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.productId}`}>
                    <h3 className="text-white font-medium text-sm line-clamp-2 hover:text-[#D4AF37] transition-colors cursor-pointer">
                      {(lang === 'ar' && item.titleAr) ? item.titleAr : item.title}
                    </h3>
                  </Link>
                  <p className="text-[#D4AF37] font-bold mt-1">${item.price.toFixed(2)}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 bg-[#0A1628] border border-white/10 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-white font-semibold w-7 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-400/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link href="/products" className="flex items-center gap-2 text-[#D4AF37] text-sm hover:text-[#D4AF37]/80 mt-4 transition-colors">
              ← {lang === 'ar' ? 'مواصلة التسوق' : 'Continue Shopping'}
            </Link>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#112240] border border-white/5 rounded-2xl p-5 sticky top-24">
              <h2 className="text-white font-bold text-lg mb-5">
                {lang === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
              </h2>

              <div className="space-y-3 pb-4 border-b border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal ({count} items)</span>
                  <span className="text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Shipping</span>
                  {shipping === 0
                    ? <span className="text-green-400 font-medium">FREE</span>
                    : <span className="text-white">${shipping.toFixed(2)}</span>
                  }
                </div>
                {subtotal < 100 && (
                  <p className="text-white/40 text-xs">Add ${(100 - subtotal).toFixed(2)} more for free shipping</p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Tax (5%)</span>
                  <span className="text-white">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-white/5">
                <span className="text-white font-bold text-lg">Total</span>
                <span className="text-[#D4AF37] font-bold text-xl">${total.toFixed(2)}</span>
              </div>

              <button
                onClick={() => setLocation('/checkout')}
                className="w-full mt-4 py-3.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors flex items-center justify-center gap-2 text-base"
              >
                {lang === 'ar' ? 'إتمام الشراء' : 'Proceed to Checkout'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="mt-4 text-center">
                <p className="text-white/30 text-xs">🔒 Secure checkout · SSL encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
