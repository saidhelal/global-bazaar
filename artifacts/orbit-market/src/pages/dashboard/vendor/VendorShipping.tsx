import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  Truck, Package, Search, Plus, Clock, CheckCircle,
  AlertCircle, ChevronRight, Navigation, RotateCcw, MapPin, X,
} from 'lucide-react';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';

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

interface VendorOrder {
  id: number;
  status: string;
  total: string;
  currency: string;
  createdAt: string;
  shippingAddress: { fullName: string; city: string; country: string };
}

const STATUS_META: Record<string, { icon: React.ReactNode; color: string; labelEn: string; labelAr: string }> = {
  created:           { icon: <Package className="w-3.5 h-3.5" />,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',     labelEn: 'Created',          labelAr: 'تم الإنشاء' },
  picked_up:         { icon: <Truck className="w-3.5 h-3.5" />,       color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', labelEn: 'Picked Up',        labelAr: 'تم الاستلام' },
  in_transit:        { icon: <Navigation className="w-3.5 h-3.5" />,  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', labelEn: 'In Transit',       labelAr: 'في الطريق' },
  out_for_delivery:  { icon: <Truck className="w-3.5 h-3.5" />,       color: 'text-primary bg-primary/10 border-primary/20',         labelEn: 'Out for Delivery', labelAr: 'خارج للتسليم' },
  delivered:         { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-green-400 bg-green-500/10 border-green-500/20',   labelEn: 'Delivered',        labelAr: 'تم التسليم' },
  failed_delivery:   { icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-red-400 bg-red-500/10 border-red-500/20',         labelEn: 'Failed',           labelAr: 'فشل' },
  returned:          { icon: <RotateCcw className="w-3.5 h-3.5" />,   color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',      labelEn: 'Returned',         labelAr: 'مُعاد' },
};

const EVENT_STATUSES = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned'];

export default function VendorShipping() {
  const { lang, dir } = useLanguage();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'orders'>('active');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState<number | null>(null);
  const [showEvent, setShowEvent] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ carrier: 'Aramex', estimatedDelivery: '', notes: '' });
  const [eventForm, setEventForm] = useState({ status: 'in_transit', location: '', locationAr: '', description: '', descriptionAr: '' });

  const tx = {
    en: {
      title: 'Shipment Management', subtitle: 'Manage and track your order shipments',
      activeShipments: 'Active Shipments', pendingOrders: 'Orders to Ship',
      searchPlaceholder: 'Search by tracking # or order ID…',
      trackingNumber: 'Tracking #', carrier: 'Carrier', status: 'Status',
      estimatedDelivery: 'Est. Delivery', created: 'Created', destination: 'Destination',
      addEvent: 'Add Event', viewTrack: 'Track',
      noShipments: 'No active shipments', noOrders: 'No orders awaiting shipment',
      ship: 'Create Shipment', cancel: 'Cancel', creating: 'Creating…',
      orderTotal: 'Total', orderDate: 'Date', customer: 'Customer',
      carrierLabel: 'Carrier', estDelivery: 'Estimated Delivery (optional)', notesLabel: 'Notes (optional)',
      eventStatus: 'Event Status', locationLabel: 'Location (English)', locationArLabel: 'Location (Arabic)',
      descLabel: 'Description (English)', descArLabel: 'Description (Arabic)',
      addEventBtn: 'Add Event', adding: 'Adding…',
    },
    ar: {
      title: 'إدارة الشحنات', subtitle: 'إدارة وتتبع شحنات طلباتك',
      activeShipments: 'الشحنات النشطة', pendingOrders: 'طلبات تنتظر الشحن',
      searchPlaceholder: 'بحث بـ رقم التتبع أو رقم الطلب…',
      trackingNumber: 'رقم التتبع', carrier: 'شركة الشحن', status: 'الحالة',
      estimatedDelivery: 'موعد التسليم المتوقع', created: 'تاريخ الإنشاء', destination: 'الوجهة',
      addEvent: 'إضافة حدث', viewTrack: 'تتبع',
      noShipments: 'لا توجد شحنات نشطة', noOrders: 'لا توجد طلبات تنتظر الشحن',
      ship: 'إنشاء شحنة', cancel: 'إلغاء', creating: 'جارٍ الإنشاء…',
      orderTotal: 'الإجمالي', orderDate: 'التاريخ', customer: 'العميل',
      carrierLabel: 'شركة الشحن', estDelivery: 'تاريخ التسليم المتوقع (اختياري)', notesLabel: 'ملاحظات (اختياري)',
      eventStatus: 'حالة الحدث', locationLabel: 'الموقع (إنجليزي)', locationArLabel: 'الموقع (عربي)',
      descLabel: 'وصف (إنجليزي)', descArLabel: 'وصف (عربي)',
      addEventBtn: 'إضافة الحدث', adding: 'جارٍ الإضافة…',
    },
  }[lang];

  useEffect(() => {
    Promise.all([
      apiFetch('/shipping/vendor').catch(() => ({ shipments: [] })),
      apiFetch('/orders').catch(() => ({ orders: [] })),
    ]).then(([s, o]) => {
      setShipments(s.shipments || []);
      const allOrders: VendorOrder[] = o.orders || [];
      // Show orders not yet shipped
      const shippedOrderIds = new Set((s.shipments || []).map((sh: Shipment) => sh.orderId));
      setOrders(allOrders.filter(ord => !shippedOrderIds.has(ord.id) && ord.status !== 'cancelled' && ord.status !== 'refunded'));
    }).finally(() => setLoading(false));
  }, []);

  async function createShipment(orderId: number) {
    setCreating(true);
    try {
      const data = await apiFetch('/shipping', {
        method: 'POST',
        body: JSON.stringify({ orderId, ...createForm }),
      });
      setShipments(prev => [data.shipment, ...prev]);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setShowCreate(null);
      setCreateForm({ carrier: 'Aramex', estimatedDelivery: '', notes: '' });
    } catch {}
    setCreating(false);
  }

  async function addEvent(shipmentId: number) {
    setCreating(true);
    try {
      const data = await apiFetch(`/shipping/${shipmentId}/events`, {
        method: 'POST',
        body: JSON.stringify(eventForm),
      });
      setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: data.shipment.status } : s));
      setShowEvent(null);
      setEventForm({ status: 'in_transit', location: '', locationAr: '', description: '', descriptionAr: '' });
    } catch {}
    setCreating(false);
  }

  const filteredShipments = shipments.filter(s =>
    !search || s.trackingNumber.toLowerCase().includes(search.toLowerCase()) || String(s.orderId).includes(search)
  );

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-4 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-[#112240] rounded-xl" />)}
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white">{tx.title}</h2>
          <p className="text-white/40 text-sm">{tx.subtitle}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#112240] rounded-xl p-4 border border-white/5">
            <p className="text-white/50 text-xs mb-1">{tx.activeShipments}</p>
            <p className="text-2xl font-bold text-white">{shipments.filter(s => s.status !== 'delivered' && s.status !== 'returned').length}</p>
          </div>
          <div className="bg-[#112240] rounded-xl p-4 border border-white/5">
            <p className="text-white/50 text-xs mb-1">{tx.pendingOrders}</p>
            <p className="text-2xl font-bold text-primary">{orders.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#112240] p-1 rounded-xl border border-white/5">
          {(['active', 'orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-primary text-[#0A1628]' : 'text-white/50 hover:text-white'}`}>
              {t === 'active' ? tx.activeShipments : tx.pendingOrders}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tx.searchPlaceholder}
            className="w-full bg-[#112240] border border-white/10 rounded-xl pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary/50" />
        </div>

        {/* ACTIVE SHIPMENTS TAB */}
        {tab === 'active' && (
          <div className="space-y-3">
            {filteredShipments.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">{tx.noShipments}</p>
              </div>
            ) : filteredShipments.map(s => {
              const meta = STATUS_META[s.status];
              return (
                <div key={s.id} className="bg-[#112240] border border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta?.color || ''}`}>
                        {meta?.icon || <Package className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-white font-semibold font-mono text-sm">{s.trackingNumber}</p>
                        <p className="text-white/40 text-xs">Order #{s.orderId} · {s.carrier}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${meta?.color || 'text-white/50 bg-white/5 border-white/10'}`}>
                      {meta?.icon}
                      {lang === 'ar' ? meta?.labelAr : meta?.labelEn}
                    </span>
                  </div>
                  {s.estimatedDelivery && (
                    <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tx.estimatedDelivery}: {new Date(s.estimatedDelivery).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {s.status !== 'delivered' && s.status !== 'returned' && (
                      <button onClick={() => { setShowEvent(s.id); setEventForm({ status: 'in_transit', location: '', locationAr: '', description: '', descriptionAr: '' }); }}
                        className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg transition-colors">
                        <Plus className="w-3.5 h-3.5" />{tx.addEvent}
                      </button>
                    )}
                    <a href={`${import.meta.env.BASE_URL || ''}track/${s.trackingNumber}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                      <Navigation className="w-3.5 h-3.5" />{tx.viewTrack}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ORDERS TO SHIP TAB */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">{tx.noOrders}</p>
              </div>
            ) : orders.map(order => (
              <div key={order.id} className="bg-[#112240] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-white font-semibold text-sm">Order #{order.id}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {order.shippingAddress.fullName} · {order.shippingAddress.city}, {order.shippingAddress.country}
                    </p>
                    <p className="text-white/40 text-xs">{order.currency} {order.total} · {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => { setShowCreate(order.id); setCreateForm({ carrier: 'Aramex', estimatedDelivery: '', notes: '' }); }}
                    className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors font-medium">
                    <Truck className="w-3.5 h-3.5" />{tx.ship}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE SHIPMENT MODAL */}
        {showCreate !== null && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-[#112240] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold">{tx.ship} — Order #{showCreate}</h3>
                <button onClick={() => setShowCreate(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-xs block mb-1.5">{tx.carrierLabel}</label>
                  <select value={createForm.carrier} onChange={e => setCreateForm(f => ({ ...f, carrier: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                    {['Aramex', 'DHL', 'FedEx', 'UPS', 'Standard', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-xs block mb-1.5">{tx.estDelivery}</label>
                  <input type="date" value={createForm.estimatedDelivery} onChange={e => setCreateForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-white/60 text-xs block mb-1.5">{tx.notesLabel}</label>
                  <input value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-primary/50"
                    placeholder="Optional notes" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShowCreate(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-medium py-2.5 rounded-xl text-sm transition-colors">{tx.cancel}</button>
                  <button onClick={() => createShipment(showCreate!)} disabled={creating}
                    className="flex-1 bg-primary text-[#0A1628] font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {creating ? tx.creating : tx.ship}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD EVENT MODAL */}
        {showEvent !== null && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-[#112240] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold">{tx.addEvent}</h3>
                <button onClick={() => setShowEvent(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-xs block mb-1.5">{tx.eventStatus}</label>
                  <select value={eventForm.status} onChange={e => setEventForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                    {EVENT_STATUSES.map(s => (
                      <option key={s} value={s}>{lang === 'ar' ? STATUS_META[s]?.labelAr : STATUS_META[s]?.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-xs block mb-1.5">{tx.locationLabel}</label>
                    <input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
                      className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-white/20"
                      placeholder="e.g. Dubai Hub" />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs block mb-1.5">{tx.locationArLabel}</label>
                    <input value={eventForm.locationAr} onChange={e => setEventForm(f => ({ ...f, locationAr: e.target.value }))}
                      dir="rtl"
                      className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-white/20"
                      placeholder="مثال: مركز دبي" />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs block mb-1.5">{tx.descLabel}</label>
                  <input value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-white/20"
                    placeholder="e.g. Package arrived at sorting facility" />
                </div>
                <div>
                  <label className="text-white/60 text-xs block mb-1.5">{tx.descArLabel}</label>
                  <input value={eventForm.descriptionAr} onChange={e => setEventForm(f => ({ ...f, descriptionAr: e.target.value }))}
                    dir="rtl"
                    className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-white/20"
                    placeholder="مثال: وصلت الطرد إلى مرفق الفرز" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShowEvent(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-medium py-2.5 rounded-xl text-sm transition-colors">{tx.cancel}</button>
                  <button onClick={() => addEvent(showEvent!)} disabled={creating}
                    className="flex-1 bg-primary text-[#0A1628] font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {creating ? tx.adding : tx.addEventBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
