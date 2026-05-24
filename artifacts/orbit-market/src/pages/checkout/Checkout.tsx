import { useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, AlertCircle, MapPin, CreditCard, Package } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../contexts/AuthContext';

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/64/64';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

type PayMethod = 'cod' | 'card';

const COUNTRIES = ['Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Bahrain', 'Qatar', 'Oman', 'Jordan', 'Egypt', 'Lebanon', 'United States', 'United Kingdom', 'Other'];

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { lang, dir } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<'address' | 'payment' | 'confirm' | 'done'>('address');
  const [payMethod, setPayMethod] = useState<PayMethod>('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);

  const [address, setAddress] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Saudi Arabia',
  });

  const shipping = subtotal >= 100 ? 0 : 9.99;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  if (items.length === 0 && step !== 'done') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Package className="w-16 h-16 text-white/20" />
          <p className="text-white/60">Your cart is empty</p>
          <button onClick={() => setLocation('/products')} className="px-6 py-2.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl">Shop Now</button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 px-4">
          <AlertCircle className="w-16 h-16 text-[#D4AF37]" />
          <h2 className="text-white text-xl font-bold">Sign in to checkout</h2>
          <p className="text-white/50 text-center">Create an account or sign in to complete your purchase</p>
          <div className="flex gap-3">
            <button onClick={() => setLocation('/login')} className="px-6 py-2.5 border border-white/20 text-white rounded-xl">Sign In</button>
            <button onClick={() => setLocation('/register')} className="px-6 py-2.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl">Register</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  function updateAddr(key: string, val: string) {
    setAddress(a => ({ ...a, [key]: val }));
  }

  function validateAddress() {
    return address.fullName && address.phone && address.addressLine1 && address.city && address.country;
  }

  async function placeOrder() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(i => ({
            productId: i.productId,
            vendorId: i.vendorId,
            title: i.title,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
          })),
          shippingAddress: address,
          paymentMethod: payMethod,
          currency: 'USD',
        }),
      });
      setOrderId(data.order.id);
      clearCart();
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ['Shipping', 'Payment', 'Review'];
  const stepIdx = step === 'address' ? 0 : step === 'payment' ? 1 : step === 'confirm' ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {step === 'done' ? (
          /* Success screen */
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-3">Order Placed!</h1>
            <p className="text-white/60 mb-2">
              Thank you for your order. We'll process it shortly.
            </p>
            {orderId && <p className="text-[#D4AF37] font-mono text-sm mb-8">Order #{orderId}</p>}
            <div className="flex flex-col gap-3">
              <button onClick={() => setLocation(`/orders/${orderId}`)} className="px-8 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors">
                View Order
              </button>
              <button onClick={() => setLocation('/products')} className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/5 transition-colors">
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: steps */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-0">
                {stepLabels.map((label, i) => (
                  <div key={label} className="flex items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                      i < stepIdx ? 'bg-green-500 text-white' : i === stepIdx ? 'bg-[#D4AF37] text-[#0A1628]' : 'bg-[#112240] text-white/30 border border-white/10'
                    }`}>{i < stepIdx ? '✓' : i + 1}</div>
                    <span className={`ml-2 rtl:mr-2 rtl:ml-0 text-sm ${i === stepIdx ? 'text-white font-semibold' : 'text-white/30'}`}>{label}</span>
                    {i < stepLabels.length - 1 && <div className={`flex-1 h-px mx-3 ${i < stepIdx ? 'bg-green-500/50' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>

              {/* Step 1: Shipping address */}
              {step === 'address' && (
                <div className="bg-[#112240] border border-white/5 rounded-2xl p-6">
                  <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#D4AF37]" /> Shipping Address
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'fullName', label: 'Full Name *', placeholder: 'John Doe' },
                      { key: 'phone', label: 'Phone *', placeholder: '+1 234 567 8900' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-white/60 text-xs mb-1.5">{f.label}</label>
                        <input
                          value={(address as any)[f.key]}
                          onChange={e => updateAddr(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <label className="block text-white/60 text-xs mb-1.5">Address Line 1 *</label>
                      <input
                        value={address.addressLine1}
                        onChange={e => updateAddr('addressLine1', e.target.value)}
                        placeholder="123 King Fahd Road"
                        className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-white/60 text-xs mb-1.5">Address Line 2</label>
                      <input
                        value={address.addressLine2}
                        onChange={e => updateAddr('addressLine2', e.target.value)}
                        placeholder="Apt, Suite, Building (optional)"
                        className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                      />
                    </div>
                    {[
                      { key: 'city', label: 'City *', placeholder: 'Riyadh' },
                      { key: 'state', label: 'State / Province', placeholder: 'Riyadh Region' },
                      { key: 'postalCode', label: 'Postal Code', placeholder: '12345' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-white/60 text-xs mb-1.5">{f.label}</label>
                        <input
                          value={(address as any)[f.key]}
                          onChange={e => updateAddr(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-white/60 text-xs mb-1.5">Country *</label>
                      <select
                        value={address.country}
                        onChange={e => updateAddr('country', e.target.value)}
                        className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none"
                      >
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (validateAddress()) setStep('payment'); }}
                    disabled={!validateAddress()}
                    className="mt-6 w-full py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                </div>
              )}

              {/* Step 2: Payment */}
              {step === 'payment' && (
                <div className="bg-[#112240] border border-white/5 rounded-2xl p-6">
                  <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#D4AF37]" /> Payment Method
                  </h2>
                  <div className="space-y-3">
                    {([
                      { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when your order arrives' },
                      { id: 'card', label: 'Credit / Debit Card', sub: 'Coming soon — use COD for now' },
                    ] as { id: PayMethod; label: string; sub: string }[]).map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        disabled={m.id === 'card'}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left rtl:text-right transition-all ${
                          payMethod === m.id ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-white/10 hover:border-white/20'
                        } ${m.id === 'card' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payMethod === m.id ? 'border-[#D4AF37]' : 'border-white/20'}`}>
                          {payMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{m.label}</p>
                          <p className="text-white/40 text-xs">{m.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setStep('address')} className="px-5 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors">
                      ← Back
                    </button>
                    <button onClick={() => setStep('confirm')} className="flex-1 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors">
                      Review Order
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 'confirm' && (
                <div className="bg-[#112240] border border-white/5 rounded-2xl p-6">
                  <h2 className="text-white font-bold text-lg mb-5">Review Your Order</h2>

                  {/* Address summary */}
                  <div className="bg-[#0A1628] rounded-xl p-4 mb-4 border border-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Shipping to</p>
                        <p className="text-white text-sm font-semibold">{address.fullName}</p>
                        <p className="text-white/60 text-xs">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}</p>
                        <p className="text-white/60 text-xs">{address.city}, {address.country}</p>
                        <p className="text-white/60 text-xs">{address.phone}</p>
                      </div>
                      <button onClick={() => setStep('address')} className="text-[#D4AF37] text-xs hover:underline">Edit</button>
                    </div>
                  </div>

                  <div className="bg-[#0A1628] rounded-xl p-4 mb-4 border border-white/5">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Payment</p>
                        <p className="text-white text-sm font-semibold capitalize">{payMethod === 'cod' ? 'Cash on Delivery' : 'Card'}</p>
                      </div>
                      <button onClick={() => setStep('payment')} className="text-[#D4AF37] text-xs hover:underline">Edit</button>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-3 mb-4">
                    {items.map(item => (
                      <div key={item.productId} className="flex gap-3 items-center">
                        <img src={getImgUrl(item.image)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/item/48/48'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{item.title}</p>
                          <p className="text-white/40 text-xs">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-[#D4AF37] text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep('payment')} className="px-5 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors">
                      ← Back
                    </button>
                    <button
                      onClick={placeOrder}
                      disabled={loading}
                      className="flex-1 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Placing Order...' : `Place Order · $${total.toFixed(2)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#112240] border border-white/5 rounded-2xl p-5 sticky top-24">
                <h2 className="text-white font-bold text-base mb-4">Order Summary</h2>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 mb-4">
                  {items.map(item => (
                    <div key={item.productId} className="flex gap-2 items-center">
                      <div className="relative flex-shrink-0">
                        <img src={getImgUrl(item.image)} alt="" className="w-10 h-10 rounded object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/mini/40/40'; }}
                        />
                        <span className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto w-4 h-4 bg-[#D4AF37] text-[#0A1628] text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <p className="flex-1 text-white/70 text-xs line-clamp-2">{item.title}</p>
                      <p className="text-white text-xs font-semibold flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Subtotal</span>
                    <span className="text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Shipping</span>
                    {shipping === 0 ? <span className="text-green-400">FREE</span> : <span className="text-white">${shipping.toFixed(2)}</span>}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Tax (5%)</span>
                    <span className="text-white">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-white/5 pt-3 mt-2">
                    <span className="text-white">Total</span>
                    <span className="text-[#D4AF37]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
