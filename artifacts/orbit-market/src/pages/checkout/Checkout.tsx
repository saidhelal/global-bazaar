import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
  CheckCircle, AlertCircle, MapPin, CreditCard, Package,
  Landmark, Globe, ChevronRight, Loader2, ShieldCheck,
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../contexts/AuthContext';
import StripePaymentForm from '../../components/payments/StripePaymentForm';
import PaymobModal from '../../components/payments/PaymobModal';

// Lazy-load stripe only if publishable key is configured
const stripePublishableKey = import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'] as string | undefined;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/64/64';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

type Gateway = 'stripe' | 'paymob' | 'myfatoorah' | 'cod';
type Step = 'address' | 'payment' | 'review' | 'stripe-pay' | 'paymob-modal' | 'processing' | 'done';

const COUNTRIES = [
  'Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Bahrain', 'Qatar', 'Oman',
  'Egypt', 'Jordan', 'Lebanon', 'United States', 'United Kingdom',
  'Germany', 'France', 'Canada', 'Australia', 'Other',
];

const GULF_COUNTRIES = new Set(['Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Bahrain', 'Qatar', 'Oman']);

function defaultGateway(country: string): Gateway {
  if (country === 'Egypt') return 'paymob';
  if (GULF_COUNTRIES.has(country)) return 'myfatoorah';
  return 'stripe';
}

const T = {
  en: {
    shipping: 'Shipping', payment: 'Payment', review: 'Review',
    shippingAddr: 'Shipping Address', payMethod: 'Payment Method',
    continuePay: 'Continue to Payment', reviewOrder: 'Review Order',
    placeOrder: 'Place Order & Pay', placing: 'Placing order…',
    cod: 'Cash on Delivery', codSub: 'Pay when your order arrives',
    stripe: 'Credit / Debit Card', stripeSub: 'Visa, Mastercard · Apple Pay · Google Pay',
    paymob: 'Paymob (Egypt)', paymobSub: 'Pay with Egyptian cards & wallets',
    myfatoorah: 'MyFatoorah (Gulf)', myfatoorahSub: 'KNET, Mada, STC Pay, NAPS & more',
    orderSummary: 'Order Summary', subtotal: 'Subtotal', shipping2: 'Shipping',
    tax: 'Tax (5%)', total: 'Total', free: 'FREE',
    edit: 'Edit', shippingTo: 'Shipping to', payWith: 'Paying with',
    back: '← Back', continueReview: 'Continue to Review',
    orderPlaced: 'Order Placed!', thankYou: 'Thank you! Your order is being processed.',
    viewOrder: 'View Order', continueShopping: 'Continue Shopping',
    signIn: 'Sign in to checkout', signInDesc: 'Create an account or sign in to complete your purchase',
    signInBtn: 'Sign In', registerBtn: 'Register',
    emptyCart: 'Your cart is empty', shopNow: 'Shop Now',
    completePay: 'Complete your payment to confirm the order',
    redirecting: 'Redirecting to payment page…',
    secureNote: 'Your payment is protected with SSL encryption',
    fullName: 'Full Name *', phone: 'Phone *', address1: 'Address Line 1 *',
    address2: 'Address Line 2', city: 'City *', state: 'State / Province',
    postal: 'Postal Code', country: 'Country *',
    order: 'Order',
  },
  ar: {
    shipping: 'الشحن', payment: 'الدفع', review: 'المراجعة',
    shippingAddr: 'عنوان الشحن', payMethod: 'طريقة الدفع',
    continuePay: 'متابعة إلى الدفع', reviewOrder: 'مراجعة الطلب',
    placeOrder: 'تأكيد الطلب والدفع', placing: 'جارٍ تقديم الطلب…',
    cod: 'الدفع عند الاستلام', codSub: 'ادفع عند وصول طلبك',
    stripe: 'بطاقة ائتمانية / مدى', stripeSub: 'Visa، Mastercard · Apple Pay · Google Pay',
    paymob: 'Paymob (مصر)', paymobSub: 'الدفع بالبطاقات المصرية والمحافظ',
    myfatoorah: 'MyFatoorah (الخليج)', myfatoorahSub: 'KNET، مدى، STC Pay، NAPS والمزيد',
    orderSummary: 'ملخص الطلب', subtotal: 'المجموع الفرعي', shipping2: 'الشحن',
    tax: 'الضريبة (5%)', total: 'الإجمالي', free: 'مجاناً',
    edit: 'تعديل', shippingTo: 'الشحن إلى', payWith: 'الدفع بـ',
    back: 'رجوع →', continueReview: 'متابعة للمراجعة',
    orderPlaced: 'تم تقديم الطلب!', thankYou: 'شكراً لك! طلبك قيد المعالجة.',
    viewOrder: 'عرض الطلب', continueShopping: 'مواصلة التسوق',
    signIn: 'سجّل دخولك لإتمام الشراء', signInDesc: 'أنشئ حساباً أو سجّل دخولك لإتمام عملية الشراء',
    signInBtn: 'تسجيل الدخول', registerBtn: 'إنشاء حساب',
    emptyCart: 'سلة التسوق فارغة', shopNow: 'تسوق الآن',
    completePay: 'أكمل دفعتك لتأكيد الطلب',
    redirecting: 'جارٍ التحويل إلى صفحة الدفع…',
    secureNote: 'دفعتك محمية بتشفير SSL',
    fullName: 'الاسم الكامل *', phone: 'الهاتف *', address1: 'عنوان السطر الأول *',
    address2: 'عنوان السطر الثاني', city: 'المدينة *', state: 'المنطقة / الولاية',
    postal: 'الرمز البريدي', country: 'الدولة *',
    order: 'طلب',
  },
};

const GATEWAY_LABELS: Record<Gateway, keyof typeof T['en']> = {
  stripe: 'stripe', paymob: 'paymob', myfatoorah: 'myfatoorah', cod: 'cod',
};
const GATEWAY_SUB_LABELS: Record<Gateway, keyof typeof T['en']> = {
  stripe: 'stripeSub', paymob: 'paymobSub', myfatoorah: 'myfatoorahSub', cod: 'codSub',
};
const GATEWAY_ICONS: Record<Gateway, React.ReactNode> = {
  stripe: <CreditCard className="w-5 h-5" />,
  paymob: <Landmark className="w-5 h-5" />,
  myfatoorah: <Globe className="w-5 h-5" />,
  cod: <Package className="w-5 h-5" />,
};

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { lang, dir } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const t = T[lang as 'en' | 'ar'] || T.en;

  const [step, setStep] = useState<Step>('address');
  const [gateway, setGateway] = useState<Gateway>('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [paymobIframeUrl, setPaymobIframeUrl] = useState<string | null>(null);

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

  // Update default gateway when country changes
  useEffect(() => {
    setGateway(defaultGateway(address.country));
  }, [address.country]);

  const shipping = subtotal >= 100 ? 0 : 9.99;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  function updateAddr(key: string, val: string) {
    setAddress(a => ({ ...a, [key]: val }));
  }

  function validateAddress() {
    return address.fullName && address.phone && address.addressLine1 && address.city && address.country;
  }

  async function createOrder(): Promise<number> {
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
        paymentMethod: gateway,
        currency: 'USD',
      }),
    });
    return data.order.id as number;
  }

  async function handlePlaceOrder() {
    setLoading(true);
    setError('');
    try {
      const newOrderId = await createOrder();
      setOrderId(newOrderId);

      if (gateway === 'cod') {
        clearCart();
        setStep('done');
        return;
      }

      if (gateway === 'stripe') {
        const data = await apiFetch('/payments/stripe/create-intent', {
          method: 'POST',
          body: JSON.stringify({ orderId: newOrderId }),
        });
        setStripeClientSecret(data.clientSecret as string);
        clearCart();
        setStep('stripe-pay');
        return;
      }

      if (gateway === 'paymob') {
        const data = await apiFetch('/payments/paymob/init', {
          method: 'POST',
          body: JSON.stringify({ orderId: newOrderId }),
        });
        setPaymobIframeUrl(data.iframeUrl as string);
        clearCart();
        setStep('paymob-modal');
        return;
      }

      if (gateway === 'myfatoorah') {
        const data = await apiFetch('/payments/myfatoorah/init', {
          method: 'POST',
          body: JSON.stringify({ orderId: newOrderId }),
        });
        clearCart();
        setStep('processing');
        // Redirect to MyFatoorah payment page
        setTimeout(() => {
          window.location.href = data.paymentUrl as string;
        }, 500);
        return;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = [t.shipping, t.payment, t.review];
  const stepIdx = step === 'address' ? 0 : step === 'payment' ? 1 : 2;

  const gatewayOptions: Gateway[] = ['stripe', 'paymob', 'myfatoorah', 'cod'];

  // ── Empty cart guard ───────────────────────────────────────────────────────
  if (items.length === 0 && step !== 'done' && step !== 'stripe-pay' && step !== 'paymob-modal' && step !== 'processing') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Package className="w-16 h-16 text-white/20" />
          <p className="text-white/60">{t.emptyCart}</p>
          <button onClick={() => setLocation('/products')} className="px-6 py-2.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl">{t.shopNow}</button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 px-4">
          <AlertCircle className="w-16 h-16 text-[#D4AF37]" />
          <h2 className="text-white text-xl font-bold">{t.signIn}</h2>
          <p className="text-white/50 text-center">{t.signInDesc}</p>
          <div className="flex gap-3">
            <button onClick={() => setLocation('/login')} className="px-6 py-2.5 border border-white/20 text-white rounded-xl">{t.signInBtn}</button>
            <button onClick={() => setLocation('/register')} className="px-6 py-2.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl">{t.registerBtn}</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Processing (MyFatoorah redirect) ───────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Loader2 className="w-14 h-14 text-[#D4AF37] animate-spin" />
          <p className="text-white font-semibold">{t.redirecting}</p>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center py-16">
            <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-3">{t.orderPlaced}</h1>
            <p className="text-white/60 mb-2">{t.thankYou}</p>
            {orderId && <p className="text-[#D4AF37] font-mono text-sm mb-8">{t.order} #{orderId}</p>}
            <div className="flex flex-col gap-3">
              <button onClick={() => setLocation(`/orders/${orderId}`)} className="px-8 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors">
                {t.viewOrder}
              </button>
              <button onClick={() => setLocation('/products')} className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/5 transition-colors">
                {t.continueShopping}
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />

      {/* Paymob modal overlay */}
      {step === 'paymob-modal' && paymobIframeUrl && orderId && (
        <PaymobModal
          iframeUrl={paymobIframeUrl}
          orderId={orderId}
          lang={lang as 'en' | 'ar'}
          onSuccess={() => setStep('done')}
          onClose={() => {
            setPaymobIframeUrl(null);
            setStep('review');
          }}
        />
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Steps ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step indicator (only for non-payment steps) */}
            {!['stripe-pay'].includes(step) && (
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
            )}

            {/* ── Step 1: Address ───────────────────────────────────────── */}
            {step === 'address' && (
              <div className="bg-[#112240] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#D4AF37]" /> {t.shippingAddr}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'fullName', label: t.fullName, placeholder: 'John Doe' },
                    { key: 'phone', label: t.phone, placeholder: '+966 50 000 0000' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-white/60 text-xs mb-1.5">{f.label}</label>
                      <input
                        value={(address as Record<string, string>)[f.key]}
                        onChange={e => updateAddr(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block text-white/60 text-xs mb-1.5">{t.address1}</label>
                    <input
                      value={address.addressLine1}
                      onChange={e => updateAddr('addressLine1', e.target.value)}
                      placeholder="123 King Fahd Road"
                      className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-white/60 text-xs mb-1.5">{t.address2}</label>
                    <input
                      value={address.addressLine2}
                      onChange={e => updateAddr('addressLine2', e.target.value)}
                      placeholder="Apt, Suite, Building (optional)"
                      className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                    />
                  </div>
                  {[
                    { key: 'city', label: t.city, placeholder: 'Riyadh' },
                    { key: 'state', label: t.state, placeholder: 'Riyadh Region' },
                    { key: 'postalCode', label: t.postal, placeholder: '12345' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-white/60 text-xs mb-1.5">{f.label}</label>
                      <input
                        value={(address as Record<string, string>)[f.key]}
                        onChange={e => updateAddr(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full bg-[#0A1628] border border-white/10 focus:border-[#D4AF37]/40 text-white text-sm px-3 py-2.5 rounded-lg outline-none transition-colors"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-white/60 text-xs mb-1.5">{t.country}</label>
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
                  className="mt-6 w-full py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {t.continuePay} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Step 2: Gateway selection ─────────────────────────────── */}
            {step === 'payment' && (
              <div className="bg-[#112240] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#D4AF37]" /> {t.payMethod}
                </h2>
                <div className="space-y-3">
                  {gatewayOptions.map(gw => (
                    <button
                      key={gw}
                      onClick={() => setGateway(gw)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left rtl:text-right transition-all ${
                        gateway === gw
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                          : 'border-white/10 hover:border-white/20 hover:bg-white/2'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        gateway === gw ? 'border-[#D4AF37]' : 'border-white/20'
                      }`}>
                        {gateway === gw && <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />}
                      </div>
                      <span className={`text-[#D4AF37] flex-shrink-0 ${gateway === gw ? 'opacity-100' : 'opacity-40'}`}>
                        {GATEWAY_ICONS[gw]}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{t[GATEWAY_LABELS[gw]]}</p>
                        <p className="text-white/40 text-xs">{t[GATEWAY_SUB_LABELS[gw]]}</p>
                      </div>
                      {/* Recommended badge */}
                      {gw === defaultGateway(address.country) && (
                        <span className="text-[10px] bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/20 flex-shrink-0">
                          {lang === 'ar' ? 'موصى به' : 'Recommended'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Stripe note if not configured */}
                {gateway === 'stripe' && !stripePublishableKey && (
                  <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Stripe is not configured yet — add STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY to enable card payments.
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep('address')} className="px-5 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors text-sm">
                    {t.back}
                  </button>
                  <button
                    onClick={() => setStep('review')}
                    className="flex-1 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors flex items-center justify-center gap-2"
                  >
                    {t.continueReview} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Review ────────────────────────────────────────── */}
            {step === 'review' && (
              <div className="bg-[#112240] border border-white/5 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-bold text-lg">{t.reviewOrder}</h2>

                {/* Address summary */}
                <div className="bg-[#0A1628] rounded-xl p-4 border border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{t.shippingTo}</p>
                      <p className="text-white text-sm font-semibold">{address.fullName}</p>
                      <p className="text-white/60 text-xs">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}</p>
                      <p className="text-white/60 text-xs">{address.city}, {address.country}</p>
                      <p className="text-white/60 text-xs">{address.phone}</p>
                    </div>
                    <button onClick={() => setStep('address')} className="text-[#D4AF37] text-xs hover:underline">{t.edit}</button>
                  </div>
                </div>

                {/* Gateway summary */}
                <div className="bg-[#0A1628] rounded-xl p-4 border border-white/5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[#D4AF37]">{GATEWAY_ICONS[gateway]}</span>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider">{t.payWith}</p>
                        <p className="text-white text-sm font-semibold">{t[GATEWAY_LABELS[gateway]]}</p>
                      </div>
                    </div>
                    <button onClick={() => setStep('payment')} className="text-[#D4AF37] text-xs hover:underline">{t.edit}</button>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.productId} className="flex gap-3 items-center">
                      <img src={getImgUrl(item.image)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/item/48/48'; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{item.title}</p>
                        <p className="text-white/40 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-[#D4AF37] text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep('payment')} className="px-5 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors text-sm">
                    {t.back}
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="flex-1 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t.placing}</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> {t.placeOrder} · {formatPrice(total)}</>
                    )}
                  </button>
                </div>

                <p className="text-center text-white/25 text-xs flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {t.secureNote}
                </p>
              </div>
            )}

            {/* ── Stripe payment form ───────────────────────────────────── */}
            {step === 'stripe-pay' && stripeClientSecret && orderId && (
              <div className="bg-[#112240] border border-white/5 rounded-2xl p-6 space-y-5">
                <div>
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#D4AF37]" /> {t.payMethod}
                  </h2>
                  <p className="text-white/40 text-xs mt-1">{t.completePay}</p>
                </div>

                {stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: stripeClientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#D4AF37',
                          colorBackground: '#0A1628',
                          colorText: '#FFFFFF',
                          colorDanger: '#ef4444',
                          fontFamily: 'system-ui, sans-serif',
                          borderRadius: '10px',
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      orderId={orderId}
                      total={total}
                      currency="$"
                      lang={lang as 'en' | 'ar'}
                      onError={msg => setError(msg)}
                    />
                  </Elements>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-sm">
                    Stripe publishable key (VITE_STRIPE_PUBLISHABLE_KEY) is not configured in environment variables.
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Order summary ─────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-[#112240] border border-white/5 rounded-2xl p-5 sticky top-24">
              <h2 className="text-white font-bold text-base mb-4">{t.orderSummary}</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-2 items-center">
                    <div className="relative flex-shrink-0">
                      <img src={getImgUrl(item.image)} alt="" className="w-10 h-10 rounded object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/mini/40/40'; }} />
                      <span className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto w-4 h-4 bg-[#D4AF37] text-[#0A1628] text-[10px] font-bold rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <p className="flex-1 text-white/70 text-xs line-clamp-2">{item.title}</p>
                    <p className="text-white text-xs font-semibold flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">{t.subtotal}</span>
                  <span className="text-white">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">{t.shipping2}</span>
                  {shipping === 0 ? <span className="text-green-400">{t.free}</span> : <span className="text-white">{formatPrice(shipping)}</span>}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">{t.tax}</span>
                  <span className="text-white">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-white/5 pt-3 mt-2">
                  <span className="text-white">{t.total}</span>
                  <span className="text-[#D4AF37]">{formatPrice(total)}</span>
                </div>
              </div>
              {/* Security badges */}
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-3 flex-wrap">
                {gateway === 'stripe' && (
                  <div className="flex items-center gap-1 text-white/20 text-xs">
                    <CreditCard className="w-3 h-3" /> Stripe
                  </div>
                )}
                {gateway === 'paymob' && (
                  <div className="flex items-center gap-1 text-white/20 text-xs">
                    <Landmark className="w-3 h-3" /> Paymob
                  </div>
                )}
                {gateway === 'myfatoorah' && (
                  <div className="flex items-center gap-1 text-white/20 text-xs">
                    <Globe className="w-3 h-3" /> MyFatoorah
                  </div>
                )}
                <div className="flex items-center gap-1 text-white/20 text-xs">
                  <ShieldCheck className="w-3 h-3" /> SSL
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
