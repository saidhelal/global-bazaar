import { ShoppingBag, Package, DollarSign, Star, TrendingUp, AlertCircle, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from './DashboardLayout';

const mockProducts = [
  { id: 1, name: 'Pro Max Headphones', price: 373, stock: 24, sales: 58, status: 'active' },
  { id: 2, name: 'Carbon Steering Wheel', price: 697, stock: 7, sales: 12, status: 'active' },
  { id: 3, name: 'Leather Weekender Bag', price: 248, stock: 0, sales: 34, status: 'out_of_stock' },
];

export default function VendorDashboard() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();

  const tx = {
    en: {
      welcome: 'Store Dashboard', pendingApproval: 'Your store is pending admin approval.',
      revenue: 'Total Revenue', orders: 'Total Orders', products: 'Active Products', rating: 'Avg. Rating',
      topProducts: 'Top Products', addProduct: 'Add Product', stock: 'Stock', sales: 'Sales',
      active: 'Active', outOfStock: 'Out of Stock', viewAll: 'View all',
      recentActivity: 'Recent Activity', quickActions: 'Quick Actions',
    },
    ar: {
      welcome: 'لوحة تحكم المتجر', pendingApproval: 'متجرك في انتظار موافقة المسؤول.',
      revenue: 'إجمالي الإيرادات', orders: 'إجمالي الطلبات', products: 'المنتجات النشطة', rating: 'متوسط التقييم',
      topProducts: 'أبرز المنتجات', addProduct: 'إضافة منتج', stock: 'المخزون', sales: 'المبيعات',
      active: 'نشط', outOfStock: 'نفد المخزون', viewAll: 'عرض الكل',
      recentActivity: 'النشاط الأخير', quickActions: 'إجراءات سريعة',
    },
  }[lang];

  const stats = [
    { label: tx.revenue, value: '$18,540', Icon: DollarSign, change: '+12%' },
    { label: tx.orders, value: '104', Icon: ShoppingBag, change: '+8%' },
    { label: tx.products, value: '23', Icon: Package, change: '+3' },
    { label: tx.rating, value: '4.8', Icon: Star, change: '+0.2' },
  ];

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
          <button className="flex items-center gap-2 bg-primary text-[#0A1628] font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
            data-testid="button-add-product">
            <Plus className="w-4 h-4" />
            {tx.addProduct}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, Icon, change }) => (
            <div key={label} className="bg-[#112240] rounded-lg p-5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/50 text-xs">{label}</p>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />{change}
              </p>
            </div>
          ))}
        </div>

        {/* Products table */}
        <div className="bg-[#112240] rounded-lg border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold">{tx.topProducts}</h3>
            <button className="text-primary text-sm hover:underline">{tx.viewAll}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-xs">
                  <th className="text-left rtl:text-right px-5 py-3 font-medium">
                    {lang === 'en' ? 'Product' : 'المنتج'}
                  </th>
                  <th className="text-left rtl:text-right px-5 py-3 font-medium">
                    {lang === 'en' ? 'Price' : 'السعر'}
                  </th>
                  <th className="text-left rtl:text-right px-5 py-3 font-medium">{tx.stock}</th>
                  <th className="text-left rtl:text-right px-5 py-3 font-medium">{tx.sales}</th>
                  <th className="text-left rtl:text-right px-5 py-3 font-medium">
                    {lang === 'en' ? 'Status' : 'الحالة'}
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 text-white font-medium">{p.name}</td>
                    <td className="px-5 py-4 text-white">${p.price}</td>
                    <td className="px-5 py-4 text-white">{p.stock}</td>
                    <td className="px-5 py-4 text-white">{p.sales}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {p.status === 'active' ? tx.active : tx.outOfStock}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="text-white/30 hover:text-primary transition-colors">
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
