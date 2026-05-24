import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Package, MapPin, CreditCard, CheckCircle, Clock, Truck, ArrowLeft } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface OrderItem {
  id: number;
  productId: number;
  title: string;
  price: string;
  quantity: number;
  subtotal: string;
  image?: string | null;
}

interface Order {
  id: number;
  status: string;
  subtotal: string;
  shippingCost: string;
  tax: string;
  total: string;
  currency: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  processing: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  shipped: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  delivered: 'bg-green-500/15 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
  refunded: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/64/64';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) { setLoading(false); return; }
    apiFetch(`/orders/${id}`)
      .then(d => { setOrder(d.order); setItems(d.items || []); })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628]" dir={dir}>
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-[#112240] rounded-2xl" />)}
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Package className="w-16 h-16 text-white/20" />
          <p className="text-white text-xl font-bold">Order not found</p>
          <button onClick={() => setLocation('/orders')} className="text-[#D4AF37] hover:underline">Back to Orders</button>
        </div>
        <Footer />
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[order.status] || 'bg-white/5 text-white/60 border-white/10';
  const currentStepIdx = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const date = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation('/orders')} className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold text-xl">Order #{order.id}</h1>
            <p className="text-white/40 text-sm">{date}</p>
          </div>
          <span className={`ml-auto rtl:mr-auto rtl:ml-0 text-sm font-semibold px-3 py-1 rounded-full border capitalize ${statusStyle}`}>
            {order.status}
          </span>
        </div>

        {/* Progress tracker */}
        {!isCancelled && (
          <div className="bg-[#112240] border border-white/5 rounded-2xl p-5 mb-4">
            <h2 className="text-white font-semibold text-sm mb-5">Order Progress</h2>
            <div className="flex items-center">
              {STATUS_STEPS.map((s, i) => {
                const done = i <= currentStepIdx;
                const active = i === currentStepIdx;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      done ? active ? 'bg-[#D4AF37]' : 'bg-green-500' : 'bg-[#0A1628] border border-white/10'
                    }`}>
                      {done && !active ? <CheckCircle className="w-4 h-4 text-white" /> : (
                        <span className="text-xs font-bold text-white">{i + 1}</span>
                      )}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 rounded ${i < currentStepIdx ? 'bg-green-500/50' : 'bg-white/10'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {STATUS_STEPS.map((s, i) => (
                <span key={s} className={`text-[10px] capitalize ${i <= currentStepIdx ? 'text-white/70' : 'text-white/20'} ${i === 0 ? 'text-left' : i === STATUS_STEPS.length - 1 ? 'text-right' : 'text-center'} flex-1`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-[#112240] border border-white/5 rounded-2xl p-5 mb-4">
          <h2 className="text-white font-semibold text-sm mb-4">Items ({items.length})</h2>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-3 items-center">
                <img
                  src={getImgUrl(item.image)}
                  alt={item.title}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/item/56/56'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">${parseFloat(item.price).toFixed(2)} × {item.quantity}</p>
                </div>
                <p className="text-[#D4AF37] font-semibold text-sm flex-shrink-0">
                  ${parseFloat(item.subtotal).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Two column: address + payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#112240] border border-white/5 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37]" /> Shipping Address
            </h2>
            <div className="space-y-1 text-sm">
              <p className="text-white font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-white/60">{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p className="text-white/60">{order.shippingAddress.addressLine2}</p>}
              <p className="text-white/60">{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}</p>
              <p className="text-white/60">{order.shippingAddress.country}</p>
              <p className="text-white/60">{order.shippingAddress.phone}</p>
            </div>
          </div>
          <div className="bg-[#112240] border border-white/5 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#D4AF37]" /> Payment
            </h2>
            <p className="text-white text-sm font-medium capitalize">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
            </p>
            {order.notes && <p className="text-white/40 text-xs mt-2">Note: {order.notes}</p>}
          </div>
        </div>

        {/* Order totals */}
        <div className="bg-[#112240] border border-white/5 rounded-2xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Subtotal</span><span className="text-white">${parseFloat(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between">
              <span className="text-white/60">Shipping</span>
              {parseFloat(order.shippingCost) === 0
                ? <span className="text-green-400">FREE</span>
                : <span className="text-white">${parseFloat(order.shippingCost).toFixed(2)}</span>
              }
            </div>
            <div className="flex justify-between"><span className="text-white/60">Tax</span><span className="text-white">${parseFloat(order.tax).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-white/5 pt-3 mt-2">
              <span className="text-white">Total</span>
              <span className="text-[#D4AF37]">${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
