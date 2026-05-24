import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Order {
  id: number;
  status: string;
  total: string;
  subtotal: string;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  shippingAddress: { fullName: string; city: string; country: string };
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  processing: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  shipped: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  delivered: 'bg-green-500/15 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
  refunded: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

export default function OrderHistory() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    apiFetch('/orders')
      .then(d => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Package className="w-16 h-16 text-white/20" />
          <p className="text-white/60">Sign in to view your orders</p>
          <button onClick={() => setLocation('/login')} className="px-6 py-2.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl">Sign In</button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-white font-bold text-2xl mb-6">{lang === 'ar' ? 'طلباتي' : 'My Orders'}</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-[#112240] rounded-2xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-full bg-[#112240] flex items-center justify-center mx-auto mb-5">
              <ShoppingBag className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-white text-xl font-bold mb-3">No orders yet</h2>
            <p className="text-white/40 mb-8">Your orders will appear here once you make a purchase</p>
            <button onClick={() => setLocation('/products')} className="px-8 py-3 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors">
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const statusStyle = STATUS_COLORS[order.status] || 'bg-white/5 text-white/60 border-white/10';
              const date = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              return (
                <button
                  key={order.id}
                  onClick={() => setLocation(`/orders/${order.id}`)}
                  className="w-full bg-[#112240] border border-white/5 hover:border-white/15 rounded-2xl p-5 text-left rtl:text-right transition-all hover:shadow-lg group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-white font-bold">Order #{order.id}</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${statusStyle}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-white/40">Date</span>
                        <span className="text-white/70">{date}</span>
                        <span className="text-white/40">Ship to</span>
                        <span className="text-white/70 truncate">{order.shippingAddress.city}, {order.shippingAddress.country}</span>
                        <span className="text-white/40">Payment</span>
                        <span className="text-white/70 capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-[#D4AF37] font-bold text-lg">${parseFloat(order.total).toFixed(2)}</span>
                      <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
