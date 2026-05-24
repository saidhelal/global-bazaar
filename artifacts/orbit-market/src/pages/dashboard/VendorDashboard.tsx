import { Link } from 'wouter';
import { ShoppingBag, Package, DollarSign, Star, TrendingUp, AlertCircle, ChevronRight, Plus, BarChart2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useVendorProducts } from '../../hooks/useProducts';
import DashboardLayout from './DashboardLayout';

export default function VendorDashboard() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { products, loading } = useVendorProducts();

  const tx = {
    en: {
      welcome: 'Store Dashboard', pendingApproval: 'Your store is pending admin approval.',
      revenue: 'Total Revenue', orders: 'Total Orders', activeProducts: 'Active Products', rating: 'Avg. Rating',
      myProducts: 'My Products', addProduct: 'Add Product',
      active: 'Active', outOfStock: 'Out of Stock', pending: 'Pending Review', rejected: 'Rejected', draft: 'Draft',
      viewAll: 'View all', noProducts: 'No products yet',
      noProductsHint: 'Add your first product to start selling.',
      sales: 'Sales', viewInventory: 'View Inventory',
      totalProducts: 'Total Products', pendingReview: 'Pending Review',
    },
    ar: {
      welcome: 'لوحة تحكم المتجر', pendingApproval: 'متجرك في انتظار موافقة المسؤول.',
      revenue: 'إجمالي الإيرادات', orders: 'إجمالي الطلبات', activeProducts: 'المنتجات النشطة', rating: 'متوسط التقييم',
      myProducts: 'منتجاتي', addProduct: 'إضافة منتج',
      active: 'نشط', outOfStock: 'نفد المخزون', pending: 'قيد المراجعة', rejected: 'مرفوض', draft: 'مسودة',
      viewAll: 'عرض الكل', noProducts: 'لا توجد منتجات بعد',
      noProductsHint: 'أضف منتجك الأول لتبدأ البيع.',
      sales: 'المبيعات', viewInventory: 'عرض المخزون',
      totalProducts: 'إجمالي المنتجات', pendingReview: 'قيد المراجعة',
    },
  }[lang];

  const approved = products.filter((p) => p.status === 'approved');
  const pending = products.filter((p) => p.status === 'pending_review');
  const rejected = products.filter((p) => p.status === 'rejected');
  const totalRevenue = approved.reduce((sum, p) => sum + (p.salesCount ?? 0) * parseFloat(p.price), 0);

  const stats = [
    { label: tx.totalProducts, value: products.length, Icon: Package, change: null },
    { label: tx.activeProducts, value: approved.length, Icon: ShoppingBag, change: null },
    { label: tx.pendingReview, value: pending.length, Icon: Star, change: null },
    { label: tx.revenue, value: `$${totalRevenue.toFixed(0)}`, Icon: DollarSign, change: null },
  ];

  const statusColor = {
    approved: 'bg-green-500/15 text-green-400',
    pending_review: 'bg-yellow-500/15 text-yellow-400',
    draft: 'bg-white/10 text-white/50',
    rejected: 'bg-red-500/15 text-red-400',
    archived: 'bg-white/5 text-white/30',
  };
  const statusLabel = (s: string) => ({ approved: tx.active, pending_review: tx.pending, draft: tx.draft, rejected: tx.rejected }[s] || s);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        {/* Pending approval banner */}
        {!user?.isVendorApproved && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-400 text-sm">{tx.pendingApproval}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{tx.welcome}</h2>
            <p className="text-white/40 text-sm">{user?.storeName || user?.fullName}</p>
          </div>
          <Link href="/dashboard/products/new"
            className="flex items-center gap-2 bg-primary text-[#0A1628] font-bold px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
            data-testid="button-add-product">
            <Plus className="w-4 h-4" />{tx.addProduct}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, Icon }) => (
            <div key={label} className="bg-[#112240] rounded-lg p-5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/50 text-xs">{label}</p>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Rejected products alert */}
        {rejected.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-red-400 text-sm">
                {rejected.length} {lang === 'en' ? 'product(s) were rejected and need your attention.' : 'منتج/منتجات مرفوضة تحتاج مراجعتك.'}
              </p>
            </div>
            <Link href="/dashboard/products?filter=rejected" className="text-red-400 text-sm hover:underline">{tx.viewAll}</Link>
          </div>
        )}

        {/* Products preview */}
        <div className="bg-[#112240] rounded-lg border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold">{tx.myProducts}</h3>
            <Link href="/dashboard/products" className="text-primary text-sm hover:underline">{tx.viewAll}</Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Package className="w-8 h-8 text-white/20" />
              <p className="text-white/50 text-sm">{tx.noProducts}</p>
              <p className="text-white/30 text-xs">{tx.noProductsHint}</p>
              <Link href="/dashboard/products/new"
                className="mt-1 bg-primary text-[#0A1628] font-bold px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
                {tx.addProduct}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {products.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#0A1628] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.coverImage
                        ? <img src={p.coverImage} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-white/20" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.title}</p>
                      <p className="text-white/40 text-xs">${parseFloat(p.price).toFixed(2)} · {tx.sales}: {p.salesCount ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[p.status] || 'bg-white/10 text-white/50'}`}>
                      {statusLabel(p.status)}
                    </span>
                    <Link href={`/dashboard/products/${p.id}/edit`}
                      className="text-white/30 hover:text-primary transition-colors">
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              ))}
              {products.length > 5 && (
                <div className="px-5 py-3 text-center">
                  <Link href="/dashboard/products" className="text-primary text-sm hover:underline">
                    {lang === 'en' ? `View all ${products.length} products` : `عرض جميع المنتجات (${products.length})`}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: lang === 'en' ? 'Add Product' : 'إضافة منتج', Icon: Plus, href: '/dashboard/products/new' },
            { label: lang === 'en' ? 'All Products' : 'جميع المنتجات', Icon: Package, href: '/dashboard/products' },
            { label: lang === 'en' ? 'Analytics' : 'التحليلات', Icon: BarChart2, href: '/dashboard/analytics' },
          ].map(({ label, Icon, href }) => (
            <Link key={label} href={href}
              className="bg-[#112240] rounded-lg p-4 border border-white/5 hover:border-primary/30 flex items-center gap-3 group transition-all">
              <div className="w-10 h-10 rounded-lg bg-[#0A1628] flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white text-sm font-medium">{label}</span>
              <ChevronRight className="w-4 h-4 text-white/30 ml-auto rtl:ml-0 rtl:mr-auto rtl:rotate-180" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
