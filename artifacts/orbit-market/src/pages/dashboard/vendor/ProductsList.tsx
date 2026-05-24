import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, Package, Edit2, Trash2, Eye, AlertTriangle, CheckCircle, Clock, XCircle, FileText, Search } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorProducts } from '../../../hooks/useProducts';
import DashboardLayout from '../DashboardLayout';

const statusMeta = {
  approved:       { color: 'bg-green-500/15 text-green-400',  Icon: CheckCircle },
  pending_review: { color: 'bg-yellow-500/15 text-yellow-400', Icon: Clock },
  draft:          { color: 'bg-white/10 text-white/50',        Icon: FileText },
  rejected:       { color: 'bg-red-500/15 text-red-400',       Icon: XCircle },
  archived:       { color: 'bg-white/5 text-white/30',         Icon: Package },
};

export default function ProductsList() {
  const { lang, dir } = useLanguage();
  const { products, loading, deleteProduct } = useVendorProducts();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const tx = {
    en: {
      title: 'My Products', subtitle: 'Manage your product catalog',
      addProduct: 'Add Product', search: 'Search products…',
      all: 'All', approved: 'Approved', pending: 'Pending', draft: 'Draft', rejected: 'Rejected',
      empty: 'No products yet', emptyHint: 'Add your first product to start selling.',
      price: 'Price', stock: 'Stock', status: 'Status', actions: 'Actions',
      deleteConfirm: 'Delete this product?', delete: 'Delete', cancel: 'Cancel',
      lowStock: 'Low stock', outOfStock: 'Out of stock',
    },
    ar: {
      title: 'منتجاتي', subtitle: 'إدارة كتالوج منتجاتك',
      addProduct: 'إضافة منتج', search: 'البحث في المنتجات…',
      all: 'الكل', approved: 'موافق عليه', pending: 'قيد المراجعة', draft: 'مسودة', rejected: 'مرفوض',
      empty: 'لا توجد منتجات بعد', emptyHint: 'أضف منتجك الأول لتبدأ البيع.',
      price: 'السعر', stock: 'المخزون', status: 'الحالة', actions: 'الإجراءات',
      deleteConfirm: 'حذف هذا المنتج؟', delete: 'حذف', cancel: 'إلغاء',
      lowStock: 'مخزون منخفض', outOfStock: 'نفد المخزون',
    },
  }[lang];

  const statusLabels = {
    en: { approved: 'Approved', pending_review: 'Pending Review', draft: 'Draft', rejected: 'Rejected', archived: 'Archived' },
    ar: { approved: 'موافق عليه', pending_review: 'قيد المراجعة', draft: 'مسودة', rejected: 'مرفوض', archived: 'مؤرشف' },
  }[lang];

  const filters = [
    { key: '', label: tx.all },
    { key: 'approved', label: tx.approved },
    { key: 'pending_review', label: tx.pending },
    { key: 'draft', label: tx.draft },
    { key: 'rejected', label: tx.rejected },
  ];

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-5" dir={dir}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{tx.title}</h2>
            <p className="text-white/40 text-sm">{tx.subtitle}</p>
          </div>
          <Link href="/dashboard/products/new"
            className="flex items-center gap-2 bg-primary text-[#0A1628] font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors"
            data-testid="button-add-product">
            <Plus className="w-4 h-4" />{tx.addProduct}
          </Link>
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

        {/* Products table */}
        <div className="bg-[#112240] rounded-lg border border-white/5 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Package className="w-10 h-10 text-white/20" />
              <p className="text-white font-medium">{tx.empty}</p>
              <p className="text-white/40 text-sm">{tx.emptyHint}</p>
              <Link href="/dashboard/products/new"
                className="mt-2 bg-primary text-[#0A1628] font-bold px-4 py-2 rounded-lg text-sm">
                {tx.addProduct}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-xs">
                    <th className="text-left rtl:text-right px-5 py-3 font-medium">
                      {lang === 'en' ? 'Product' : 'المنتج'}
                    </th>
                    <th className="text-left rtl:text-right px-4 py-3 font-medium">{tx.price}</th>
                    <th className="text-left rtl:text-right px-4 py-3 font-medium">{tx.stock}</th>
                    <th className="text-left rtl:text-right px-4 py-3 font-medium">{tx.status}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((p) => {
                    const { color, Icon } = statusMeta[p.status] || statusMeta.draft;
                    const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5);
                    const isOutOfStock = p.stock === 0;
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#0A1628] flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {p.coverImage
                                ? <img src={p.coverImage} alt="" className="w-full h-full object-cover" />
                                : <Package className="w-5 h-5 text-white/20" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate max-w-[180px]">{p.title}</p>
                              <p className="text-white/40 text-xs">{p.category}{p.sku ? ` · ${p.sku}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-white font-semibold">${parseFloat(p.price).toFixed(2)}</span>
                            {p.compareAtPrice && (
                              <span className="text-white/30 text-xs line-through">${parseFloat(p.compareAtPrice).toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className={isOutOfStock ? 'text-red-400 font-semibold' : isLowStock ? 'text-yellow-400' : 'text-white'}>
                              {p.stock}
                            </span>
                            {isOutOfStock && <span className="text-red-400/70 text-xs">{tx.outOfStock}</span>}
                            {isLowStock && <span className="text-yellow-400/70 text-xs">{tx.lowStock}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full w-fit ${color}`}>
                            <Icon className="w-3 h-3" />
                            {statusLabels[p.status]}
                          </span>
                          {p.status === 'rejected' && p.rejectionReason && (
                            <p className="text-red-400/60 text-xs mt-1 max-w-[140px] truncate">{p.rejectionReason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {confirmDelete === p.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => { deleteProduct(p.id); setConfirmDelete(null); }}
                                className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
                                data-testid={`button-confirm-delete-${p.id}`}>{tx.delete}</button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="text-white/40 text-xs hover:text-white transition-colors">{tx.cancel}</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/products/${p.id}/edit`}
                                className="text-white/40 hover:text-primary transition-colors"
                                data-testid={`button-edit-${p.id}`}>
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              <button onClick={() => setConfirmDelete(p.id)}
                                className="text-white/40 hover:text-red-400 transition-colors"
                                data-testid={`button-delete-${p.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {products.length > 0 && (
          <div className="flex gap-4 text-xs text-white/40">
            {Object.entries(
              products.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>)
            ).map(([status, count]) => (
              <span key={status}>{statusLabels[status as keyof typeof statusLabels]}: <strong className="text-white/60">{count}</strong></span>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
