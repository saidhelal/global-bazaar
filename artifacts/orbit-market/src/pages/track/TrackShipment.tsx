import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  Package, Search, MapPin, Truck, CheckCircle, Clock, AlertCircle,
  ArrowLeft, Navigation, RotateCcw,
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { apiFetch } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface ShipmentEvent {
  id: number;
  status: string;
  location?: string;
  locationAr?: string;
  description?: string;
  descriptionAr?: string;
  occurredAt: string;
}

interface Shipment {
  id: number;
  orderId: number;
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
}

interface TrackingOrder {
  id: number;
  status: string;
  shippingAddress: {
    fullName: string;
    city: string;
    country: string;
  };
}

const STATUS_META: Record<string, { icon: React.ReactNode; color: string; labelEn: string; labelAr: string }> = {
  created:           { icon: <Package className="w-4 h-4" />,      color: 'text-blue-400 bg-blue-500/15',     labelEn: 'Shipment Created',      labelAr: 'تم إنشاء الشحنة' },
  picked_up:         { icon: <Truck className="w-4 h-4" />,         color: 'text-purple-400 bg-purple-500/15', labelEn: 'Picked Up',             labelAr: 'تم الاستلام' },
  in_transit:        { icon: <Navigation className="w-4 h-4" />,    color: 'text-yellow-400 bg-yellow-500/15', labelEn: 'In Transit',            labelAr: 'في الطريق' },
  out_for_delivery:  { icon: <Truck className="w-4 h-4" />,         color: 'text-primary bg-primary/15',       labelEn: 'Out for Delivery',      labelAr: 'خارج للتسليم' },
  delivered:         { icon: <CheckCircle className="w-4 h-4" />,   color: 'text-green-400 bg-green-500/15',   labelEn: 'Delivered',             labelAr: 'تم التسليم' },
  failed_delivery:   { icon: <AlertCircle className="w-4 h-4" />,   color: 'text-red-400 bg-red-500/15',       labelEn: 'Delivery Failed',       labelAr: 'فشل التسليم' },
  returned:          { icon: <RotateCcw className="w-4 h-4" />,     color: 'text-gray-400 bg-gray-500/15',     labelEn: 'Returned',              labelAr: 'مُعاد' },
};

const ORDERED_STEPS = ['created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];

export default function TrackShipment() {
  const { number } = useParams<{ number?: string }>();
  const [, setLocation] = useLocation();
  const { lang, dir } = useLanguage();
  const [input, setInput] = useState(number || '');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const tx = {
    en: {
      title: 'Track Your Shipment',
      subtitle: 'Enter your tracking number to see the latest delivery status',
      placeholder: 'Enter tracking number (e.g. ORB1234567890)',
      track: 'Track',
      trackingNumber: 'Tracking Number',
      carrier: 'Carrier',
      estimatedDelivery: 'Estimated Delivery',
      shippedAt: 'Shipped',
      deliveredAt: 'Delivered',
      destination: 'Destination',
      notFound: 'Shipment not found. Please check the tracking number.',
      tryAgain: 'Try another tracking number',
      backToStore: 'Back to Store',
      trackingHistory: 'Tracking History',
      orderId: 'Order',
      noEvents: 'No tracking events yet.',
    },
    ar: {
      title: 'تتبع شحنتك',
      subtitle: 'أدخل رقم التتبع لمعرفة آخر حالة التسليم',
      placeholder: 'أدخل رقم التتبع (مثال: ORB1234567890)',
      track: 'تتبع',
      trackingNumber: 'رقم التتبع',
      carrier: 'شركة الشحن',
      estimatedDelivery: 'موعد التسليم المتوقع',
      shippedAt: 'تاريخ الشحن',
      deliveredAt: 'تاريخ التسليم',
      destination: 'الوجهة',
      notFound: 'لم يتم العثور على الشحنة. يرجى التحقق من رقم التتبع.',
      tryAgain: 'جرب رقم تتبع آخر',
      backToStore: 'العودة للمتجر',
      trackingHistory: 'سجل التتبع',
      orderId: 'الطلب',
      noEvents: 'لا توجد أحداث تتبع بعد.',
    },
  }[lang];

  async function doTrack(trackNum: string) {
    if (!trackNum.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const data = await apiFetch(`/shipping/track/${trackNum.trim()}`);
      setShipment(data.shipment);
      setEvents(data.events || []);
      setOrder(data.order || null);
      setLocation(`/track/${trackNum.trim()}`, { replace: true });
    } catch {
      setShipment(null);
      setEvents([]);
      setOrder(null);
      setError(tx.notFound);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (number) doTrack(number);
  }, [number]);

  const statusMeta = shipment ? STATUS_META[shipment.status] : null;
  const currentStepIdx = shipment ? ORDERED_STEPS.indexOf(shipment.status) : -1;

  function formatDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">

        {/* Page header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">{tx.title}</h1>
          <p className="text-white/40 text-sm">{tx.subtitle}</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-8">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doTrack(input)}
            placeholder={tx.placeholder}
            className="flex-1 bg-[#112240] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            data-testid="input-tracking-number"
          />
          <button
            onClick={() => doTrack(input)}
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-[#0A1628] font-bold px-5 py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm flex-shrink-0"
            data-testid="button-track-shipment"
          >
            {loading ? <div className="w-4 h-4 border-2 border-[#0A1628]/30 border-t-[#0A1628] rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            {tx.track}
          </button>
        </div>

        {/* Error state */}
        {error && searched && !shipment && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 text-sm mb-4">{error}</p>
            <button onClick={() => { setError(''); setSearched(false); setInput(''); }}
              className="text-primary text-sm hover:underline">{tx.tryAgain}</button>
          </div>
        )}

        {/* Result */}
        {shipment && (
          <div className="space-y-4">

            {/* Status card */}
            <div className="bg-[#112240] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-5">
                {statusMeta && (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${statusMeta.color}`}>
                    {statusMeta.icon}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-bold text-lg">{statusMeta ? (lang === 'ar' ? statusMeta.labelAr : statusMeta.labelEn) : shipment.status}</p>
                  <p className="text-white/40 text-sm">{tx.trackingNumber}: <span className="text-primary font-mono">{shipment.trackingNumber}</span></p>
                </div>
              </div>

              {/* Progress bar (for non-failed/returned) */}
              {currentStepIdx >= 0 && !['failed_delivery', 'returned'].includes(shipment.status) && (
                <div className="mb-5">
                  <div className="flex items-center gap-0">
                    {ORDERED_STEPS.map((step, i) => {
                      const done = i <= currentStepIdx;
                      const active = i === currentStepIdx;
                      const meta = STATUS_META[step];
                      return (
                        <div key={step} className="flex items-center flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all text-xs ${
                            done
                              ? active ? 'bg-primary text-[#0A1628]' : 'bg-green-500 text-white'
                              : 'bg-[#0A1628] border border-white/10 text-white/20'
                          }`}>
                            {done && !active ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                          </div>
                          {i < ORDERED_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 ${i < currentStepIdx ? 'bg-green-500/40' : 'bg-white/10'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {ORDERED_STEPS.map((step, i) => (
                      <span key={step} className={`text-[9px] text-center flex-1 ${i <= currentStepIdx ? 'text-white/60' : 'text-white/20'}`}>
                        {lang === 'ar' ? STATUS_META[step]?.labelAr : STATUS_META[step]?.labelEn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#0A1628] rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1">{tx.carrier}</p>
                  <p className="text-white font-medium">{shipment.carrier}</p>
                </div>
                {order && (
                  <div className="bg-[#0A1628] rounded-xl p-3">
                    <p className="text-white/40 text-xs mb-1">{tx.orderId}</p>
                    <p className="text-white font-medium">#{order.id}</p>
                  </div>
                )}
                {shipment.estimatedDelivery && (
                  <div className="bg-[#0A1628] rounded-xl p-3">
                    <p className="text-white/40 text-xs mb-1">{tx.estimatedDelivery}</p>
                    <p className="text-white font-medium">{formatDate(shipment.estimatedDelivery)}</p>
                  </div>
                )}
                {shipment.shippedAt && (
                  <div className="bg-[#0A1628] rounded-xl p-3">
                    <p className="text-white/40 text-xs mb-1">{tx.shippedAt}</p>
                    <p className="text-white font-medium">{formatDate(shipment.shippedAt)}</p>
                  </div>
                )}
                {shipment.deliveredAt && (
                  <div className="bg-[#0A1628] rounded-xl p-3 col-span-2">
                    <p className="text-white/40 text-xs mb-1">{tx.deliveredAt}</p>
                    <p className="text-green-400 font-medium">{formatDate(shipment.deliveredAt)}</p>
                  </div>
                )}
                {order?.shippingAddress && (
                  <div className="bg-[#0A1628] rounded-xl p-3">
                    <p className="text-white/40 text-xs mb-1">{tx.destination}</p>
                    <p className="text-white font-medium">{order.shippingAddress.city}, {order.shippingAddress.country}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking events timeline */}
            <div className="bg-[#112240] border border-white/5 rounded-2xl p-5">
              <h2 className="text-white font-semibold text-sm mb-4">{tx.trackingHistory}</h2>
              {events.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">{tx.noEvents}</p>
              ) : (
                <div className="space-y-0">
                  {events.map((ev, idx) => {
                    const meta = STATUS_META[ev.status];
                    const isFirst = idx === 0;
                    return (
                      <div key={ev.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isFirst ? (meta?.color || 'text-primary bg-primary/15') : 'text-white/30 bg-white/5'}`}>
                            {meta?.icon || <Clock className="w-4 h-4" />}
                          </div>
                          {idx < events.length - 1 && <div className="w-0.5 flex-1 bg-white/5 my-1" />}
                        </div>
                        <div className={`pb-4 flex-1 ${idx === events.length - 1 ? '' : ''}`}>
                          <p className={`text-sm font-semibold ${isFirst ? 'text-white' : 'text-white/60'}`}>
                            {lang === 'ar' ? (meta?.labelAr || ev.status) : (meta?.labelEn || ev.status)}
                          </p>
                          {(ev.description || ev.descriptionAr) && (
                            <p className="text-white/40 text-xs mt-0.5">
                              {lang === 'ar' ? (ev.descriptionAr || ev.description) : (ev.description || ev.descriptionAr)}
                            </p>
                          )}
                          {(ev.location || ev.locationAr) && (
                            <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {lang === 'ar' ? (ev.locationAr || ev.location) : (ev.location || ev.locationAr)}
                            </p>
                          )}
                          <p className="text-white/25 text-xs mt-1">
                            {new Date(ev.occurredAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mt-2">
              <ArrowLeft className="w-4 h-4" />
              {tx.backToStore}
            </button>
          </div>
        )}

        {/* Initial state (not yet searched) */}
        {!searched && !shipment && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">
              {lang === 'ar' ? 'أدخل رقم التتبع أعلاه لتتبع شحنتك' : 'Enter your tracking number above to track your shipment'}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
