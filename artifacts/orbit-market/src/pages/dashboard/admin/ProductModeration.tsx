import { useState } from 'react';
import { CheckCircle, XCircle, Star, StarOff, Package, Eye, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminProducts } from '../../../hooks/useProducts';
import DashboardLayout from '../DashboardLayout';

export default function ProductModeration() {
  const { lang, dir } = useLanguage();
  const [filterStatus, setFilterStatus] = useState('pending_review');
  const { products, loading, approve, reject, feature } = useAdminProducts(filterStatus || undefined);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [search, setSearch] = useState('');

  const tx = {
    en: {
      title: 'Product Moderation', subtitle: 'Review and approve vendor products',
      all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', draft: 'Drafts',
      approve: 'Approve', reject: 'Reject', feature: 'Feature', unfeature: 'Unfeature',
      rejectionReason: 'Rejection reason', rejectConfirm: 'Confirm Rejection', cancel: 'Cancel',
      adminNotes: 'Admin notes (optional)', empty: 'No products to review',
      price: 'Price', stock: 'Stock', vendor: 'Vendor ID', category: 'Category',
      search: 'Search products…', viewImages: 'images',
    },
    ar: {
      title: 'إشراف المنتجات', subtitle: 'مراجعة وموافقة منتجات البائعين',
      all: 'الكل', pending: 'قيد المراجعة', approved: 'موافق عليه', rejected: 'مرفوض', draft: 'مسودات',
      approve: 'موافقة', reject: 'رفض', feature: 'تمييز', unfeature: 'إلغاء التمييز',
      rejectionReason: 'سبب الرفض', rejectConfirm: 'تأكيد الرفض', cancel: 'إلغاء',
      adminNotes: 'ملاحظات المسؤول (اختياري)', empty: 'لا توجد منتجات للمراجعة',
      price: 'السعر', stock: 'المخزون', vendor: 'معرف البائع', category: 'الفئة',
      search: 'البحث في المنتجات…', viewImages: 'صور',
    },
  }[lang];

  const statusLabels = {
    en: { approved: 'Approved', pending_review: 'Pending', draft: 'Draft', rejected: 'Rejected', archived: 'Archived' },
    ar: { approved: 'موافق عليه', pending_review: 'قيد المراجعة', draft: 'مسودة', rejected: 'مرفوض', archived: 'مؤرشف' },
  }[lang];

  const filters = [
    { key: '', label: tx.all },
    { key: 'pending_review', label: tx.pending },
    { key: 'approved', label: tx.approved },
    { key: 'rejected', label: tx.rejected },
    { key: 'draft', label: tx.draft },
  ];

  const filtered = products.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || String(p.vendorId).includes(search)
  );

  async function handleApprove(id: number) {
    await approve(id, adminNotes || undefined);
    setAdminNotes('');
    setExpanded(null);
  }

  async function handleReject(id: number) {
    if (!rejectReason.trim()) return;
    await reject(id, rejectReason);
    setRejectReason('');
    setRejectingId(null);
    setExpanded(null);
  }

  return (
    <DashboardLayout>
      <div className="space-y-5" dir={dir}>
        <div>
          <h2 className="text-xl font-bold text-white">{tx.title}</h2>
          <p className="text-white/40 text-sm">{tx.subtitle}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#112240] border border-white/10 text-white pl-9 rtl:pl-4 rtl:pr-9 pr-4 py-2.5 rounded-lg text-sm outline-none focus:border-primary/60 transition-colors placeholder-white/20"
              placeholder={tx.search} />
          </div>
          <div className="flex gap-1 bg-[#112240] p-1 rounded-lg border border-white/5 flex-shrink-0 overflow-x-auto">
            {filters.map(({ key, label }) => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  filterStatus === key ? 'bg-primary text-[#0A1628]' : 'text-white/50 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Product cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[#112240] rounded-lg border border-white/5">
            <Package className="w-10 h-10 text-white/20" />
            <p className="text-white/50">{tx.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const isExpanded = expanded === p.id;
              const isRejecting = rejectingId === p.id;
              return (
                <div key={p.id} className="bg-[#112240] rounded-lg border border-white/5 overflow-hidden">
                  {/* Product summary row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-12 h-12 rounded-lg bg-[#0A1628] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.coverImage
                        ? <img src={p.coverImage} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-6 h-6 text-white/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold truncate">{p.title}</p>
                        {p.isFeatured && <Star className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-white/40 text-xs">{p.category}</span>
                        <span className="text-primary text-xs font-semibold">${parseFloat(p.price).toFixed(2)}</span>
                        <span className="text-white/30 text-xs">{tx.stock}: {p.stock}</span>
                        <span className="text-white/30 text-xs">{tx.vendor}: #{p.vendorId}</span>
                        {(p.images?.length ?? 0) > 0 && (
                          <span className="text-white/30 text-xs"><Eye className="w-3 h-3 inline mr-0.5" />{p.images!.length} {tx.viewImages}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === 'approved' ? 'bg-green-500/15 text-green-400'
                        : p.status === 'pending_review' ? 'bg-yellow-500/15 text-yellow-400'
                        : p.status === 'rejected' ? 'bg-red-500/15 text-red-400'
                        : 'bg-white/10 text-white/50'}`}>
                        {statusLabels[p.status]}
                      </span>
                      <button onClick={() => setExpanded(isExpanded ? null : p.id)}
                        className="text-white/40 hover:text-white transition-colors p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-5 py-4 space-y-4">
                      {/* Description */}
                      {p.description && (
                        <div>
                          <p className="text-white/40 text-xs mb-1">{lang === 'en' ? 'Description' : 'الوصف'}</p>
                          <p className="text-white/70 text-sm leading-relaxed">{p.description}</p>
                        </div>
                      )}
                      {/* Images */}
                      {(p.images?.length ?? 0) > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {p.images!.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noreferrer">
                              <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-white/10 hover:border-primary/50 transition-colors" />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Admin notes input */}
                      {!isRejecting && (
                        <div>
                          <label className="block text-white/40 text-xs mb-1.5">{tx.adminNotes}</label>
                          <input value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                            className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/40 text-white px-3 py-2 rounded-lg text-sm outline-none"
                            data-testid={`input-admin-notes-${p.id}`} />
                        </div>
                      )}

                      {/* Rejection form */}
                      {isRejecting && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
                          <label className="block text-red-400 text-sm font-medium">{tx.rejectionReason} *</label>
                          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2}
                            className="w-full bg-[#0A1628] border border-red-500/30 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none"
                            placeholder={lang === 'en' ? 'e.g. Images are blurry, price not competitive, missing description' : 'مثال: الصور ضبابية، السعر غير تنافسي، الوصف مفقود'}
                            data-testid={`input-reject-reason-${p.id}`} />
                          <div className="flex gap-2">
                            <button onClick={() => handleReject(p.id)}
                              className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                              data-testid={`button-confirm-reject-${p.id}`}>{tx.rejectConfirm}</button>
                            <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                              className="text-white/50 text-sm hover:text-white transition-colors px-3">{tx.cancel}</button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isRejecting && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.status !== 'approved' && (
                            <button onClick={() => handleApprove(p.id)}
                              className="flex items-center gap-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                              data-testid={`button-approve-${p.id}`}>
                              <CheckCircle className="w-4 h-4" />{tx.approve}
                            </button>
                          )}
                          {p.status !== 'rejected' && (
                            <button onClick={() => { setRejectingId(p.id); setRejectReason(''); }}
                              className="flex items-center gap-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                              data-testid={`button-reject-${p.id}`}>
                              <XCircle className="w-4 h-4" />{tx.reject}
                            </button>
                          )}
                          <button onClick={() => feature(p.id, !p.isFeatured)}
                            className="flex items-center gap-1.5 bg-primary/15 text-primary hover:bg-primary/25 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                            data-testid={`button-feature-${p.id}`}>
                            {p.isFeatured ? <><StarOff className="w-4 h-4" />{tx.unfeature}</> : <><Star className="w-4 h-4" />{tx.feature}</>}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
