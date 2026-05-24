import { useState, useEffect } from 'react';
import { Globe, Plus, Pencil, Trash2, X, Save, Truck, Package } from 'lucide-react';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';

interface ShippingRate {
  id: number;
  zoneId: number;
  carrier: string;
  baseFee: string;
  freeThreshold?: string | null;
  minDays: number;
  maxDays: number;
}

interface ShippingZone {
  id: number;
  name: string;
  nameAr: string;
  countries: string[];
  isActive: boolean;
  rate?: ShippingRate | null;
}

interface ZoneForm {
  name: string;
  nameAr: string;
  countries: string;
  isActive: boolean;
  carrier: string;
  baseFee: string;
  freeThreshold: string;
  minDays: string;
  maxDays: string;
}

const EMPTY_FORM: ZoneForm = {
  name: '', nameAr: '', countries: '', isActive: true,
  carrier: 'Aramex', baseFee: '9.99', freeThreshold: '100', minDays: '3', maxDays: '7',
};

const COUNTRY_NAMES: Record<string, string> = {
  SA: 'Saudi Arabia', AE: 'UAE', KW: 'Kuwait', BH: 'Bahrain', QA: 'Qatar', OM: 'Oman',
  EG: 'Egypt', JO: 'Jordan', LB: 'Lebanon', SY: 'Syria', IQ: 'Iraq',
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France', IN: 'India',
};

export default function ShippingZones() {
  const { lang, dir } = useLanguage();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editZone, setEditZone] = useState<ShippingZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const tx = {
    en: {
      title: 'Shipping Zones', subtitle: 'Configure shipping zones and delivery rates',
      addZone: 'Add Zone', editZone: 'Edit Zone',
      name: 'Zone Name (EN)', nameAr: 'Zone Name (AR)',
      countries: 'Countries (comma-separated country codes, leave empty for catch-all)',
      isActive: 'Active',
      carrier: 'Carrier', baseFee: 'Base Fee ($)', freeThreshold: 'Free Shipping Threshold ($)',
      minDays: 'Min Days', maxDays: 'Max Days',
      save: 'Save Zone', saving: 'Saving…', cancel: 'Cancel',
      noZones: 'No shipping zones configured.',
      zone: 'Zone', rate: 'Rate', delivery: 'Delivery', countries_: 'Countries',
      active: 'Active', inactive: 'Inactive', edit: 'Edit', delete: 'Delete',
      freeAt: 'Free at', days: 'days', catchAll: 'Catch-all (International)',
      confirmDelete: 'Delete this shipping zone?',
    },
    ar: {
      title: 'مناطق الشحن', subtitle: 'تكوين مناطق الشحن وأسعار التوصيل',
      addZone: 'إضافة منطقة', editZone: 'تعديل المنطقة',
      name: 'اسم المنطقة (إنجليزي)', nameAr: 'اسم المنطقة (عربي)',
      countries: 'الدول (رموز مفصولة بفاصلة، اتركه فارغاً للشحن الدولي)',
      isActive: 'نشطة',
      carrier: 'شركة الشحن', baseFee: 'رسوم الشحن الأساسية ($)', freeThreshold: 'حد الشحن المجاني ($)',
      minDays: 'أقل مدة', maxDays: 'أقصى مدة',
      save: 'حفظ المنطقة', saving: 'جارٍ الحفظ…', cancel: 'إلغاء',
      noZones: 'لا توجد مناطق شحن مضافة.',
      zone: 'المنطقة', rate: 'السعر', delivery: 'مدة التوصيل', countries_: 'الدول',
      active: 'نشطة', inactive: 'غير نشطة', edit: 'تعديل', delete: 'حذف',
      freeAt: 'مجاني عند', days: 'أيام', catchAll: 'شحن دولي (الكل)',
      confirmDelete: 'هل تريد حذف منطقة الشحن هذه؟',
    },
  }[lang];

  useEffect(() => { fetchZones(); }, []);

  async function fetchZones() {
    setLoading(true);
    try {
      const data = await apiFetch('/shipping/zones');
      setZones(data.zones || []);
    } catch {}
    setLoading(false);
  }

  function openCreate() {
    setEditZone(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(zone: ShippingZone) {
    setEditZone(zone);
    setForm({
      name: zone.name,
      nameAr: zone.nameAr,
      countries: (zone.countries || []).join(', '),
      isActive: zone.isActive ?? true,
      carrier: zone.rate?.carrier || 'Aramex',
      baseFee: zone.rate?.baseFee || '9.99',
      freeThreshold: zone.rate?.freeThreshold || '100',
      minDays: String(zone.rate?.minDays || 3),
      maxDays: String(zone.rate?.maxDays || 7),
    });
    setShowForm(true);
  }

  async function saveZone() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        nameAr: form.nameAr,
        countries: form.countries.split(',').map(c => c.trim().toUpperCase()).filter(Boolean),
        isActive: form.isActive,
        rate: {
          carrier: form.carrier,
          baseFee: form.baseFee,
          freeThreshold: form.freeThreshold || null,
          minDays: parseInt(form.minDays),
          maxDays: parseInt(form.maxDays),
        },
      };

      if (editZone) {
        await apiFetch(`/shipping/zones/${editZone.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/shipping/zones', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      fetchZones();
    } catch {}
    setSaving(false);
  }

  async function deleteZone(id: number) {
    if (!confirm(tx.confirmDelete)) return;
    setDeletingId(id);
    try {
      await apiFetch(`/shipping/zones/${id}`, { method: 'DELETE' });
      setZones(prev => prev.filter(z => z.id !== id));
    } catch {}
    setDeletingId(null);
  }

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-4 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-[#112240] rounded-xl" />)}
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{tx.title}</h2>
            <p className="text-white/40 text-sm">{tx.subtitle}</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-[#0A1628] font-bold px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />{tx.addZone}
          </button>
        </div>

        {/* Zones list */}
        {zones.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">{tx.noZones}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {zones.map(zone => (
              <div key={zone.id} className="bg-[#112240] border border-white/5 rounded-xl p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">{lang === 'ar' ? zone.nameAr : zone.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${zone.isActive ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'}`}>
                        {zone.isActive ? tx.active : tx.inactive}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                      {zone.countries && zone.countries.length > 0
                        ? zone.countries.map(c => COUNTRY_NAMES[c] || c).join(', ')
                        : tx.catchAll}
                    </p>
                    {zone.rate && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-white/60">
                          <Truck className="w-3 h-3" />{zone.rate.carrier}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-primary font-semibold">
                          ${zone.rate.baseFee}
                          {zone.rate.freeThreshold && <span className="text-white/40 font-normal">· {tx.freeAt} ${zone.rate.freeThreshold}</span>}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/50">
                          <Package className="w-3 h-3" />{zone.rate.minDays}–{zone.rate.maxDays} {tx.days}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(zone)}
                      className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />{tx.edit}
                    </button>
                    <button onClick={() => deleteZone(zone.id)} disabled={deletingId === zone.id}
                      className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />{tx.delete}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ZONE FORM MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-[#112240] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold">{editZone ? tx.editZone : tx.addZone}</h3>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-xs block mb-1.5">{tx.name}</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-white/20"
                      placeholder="Gulf Countries" />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs block mb-1.5">{tx.nameAr}</label>
                    <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} dir="rtl"
                      className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-white/20"
                      placeholder="دول الخليج" />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs block mb-1.5">{tx.countries}</label>
                  <input value={form.countries} onChange={e => setForm(f => ({ ...f, countries: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-white/20"
                    placeholder="SA, AE, KW, BH, QA, OM" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-primary" />
                  <label htmlFor="isActive" className="text-white/70 text-sm">{tx.isActive}</label>
                </div>

                {/* Rate section */}
                <div className="border-t border-white/5 pt-4">
                  <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Shipping Rate</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-white/60 text-xs block mb-1.5">{tx.carrier}</label>
                      <select value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
                        className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                        {['Aramex', 'DHL', 'FedEx', 'UPS', 'Standard', 'Other'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white/60 text-xs block mb-1.5">{tx.baseFee}</label>
                        <input type="number" step="0.01" value={form.baseFee} onChange={e => setForm(f => ({ ...f, baseFee: e.target.value }))}
                          className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
                      </div>
                      <div>
                        <label className="text-white/60 text-xs block mb-1.5">{tx.freeThreshold}</label>
                        <input type="number" step="0.01" value={form.freeThreshold} onChange={e => setForm(f => ({ ...f, freeThreshold: e.target.value }))}
                          className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                          placeholder="e.g. 100" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white/60 text-xs block mb-1.5">{tx.minDays}</label>
                        <input type="number" min="1" value={form.minDays} onChange={e => setForm(f => ({ ...f, minDays: e.target.value }))}
                          className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
                      </div>
                      <div>
                        <label className="text-white/60 text-xs block mb-1.5">{tx.maxDays}</label>
                        <input type="number" min="1" value={form.maxDays} onChange={e => setForm(f => ({ ...f, maxDays: e.target.value }))}
                          className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-medium py-2.5 rounded-xl text-sm transition-colors">{tx.cancel}</button>
                  <button onClick={saveZone} disabled={saving || !form.name || !form.nameAr}
                    className="flex-1 bg-primary text-[#0A1628] font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />{saving ? tx.saving : tx.save}
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
