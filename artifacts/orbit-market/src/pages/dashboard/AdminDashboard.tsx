import { useState, useEffect } from 'react';
import { Users, Store, ShoppingBag, DollarSign, TrendingUp, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch } from '../../contexts/AuthContext';
import DashboardLayout from './DashboardLayout';

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  isVendorApproved: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { lang, dir } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const tx = {
    en: {
      title: 'Admin Dashboard', subtitle: 'Platform overview and management',
      totalUsers: 'Total Users', totalVendors: 'Total Vendors', totalOrders: 'Total Orders', revenue: 'Platform Revenue',
      pendingVendors: 'Pending Vendor Approvals', allUsers: 'All Users',
      approve: 'Approve', approved: 'Approved', pending: 'Pending', viewAll: 'View all',
      role: 'Role', status: 'Status', joined: 'Joined', actions: 'Actions',
      customer: 'Customer', vendor: 'Vendor', admin: 'Admin',
    },
    ar: {
      title: 'لوحة تحكم المسؤول', subtitle: 'نظرة عامة وإدارة المنصة',
      totalUsers: 'إجمالي المستخدمين', totalVendors: 'إجمالي البائعين', totalOrders: 'إجمالي الطلبات', revenue: 'إيرادات المنصة',
      pendingVendors: 'طلبات الموافقة على البائعين', allUsers: 'جميع المستخدمين',
      approve: 'موافقة', approved: 'موافق عليه', pending: 'قيد الانتظار', viewAll: 'عرض الكل',
      role: 'الدور', status: 'الحالة', joined: 'انضم في', actions: 'الإجراءات',
      customer: 'عميل', vendor: 'بائع', admin: 'مسؤول',
    },
  }[lang];

  useEffect(() => {
    apiFetch('/auth/admin/users')
      .then((d) => setUsers(d.users))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  async function approveVendor(id: number) {
    try {
      await apiFetch(`/auth/admin/users/${id}/approve`, { method: 'PUT' });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isVendorApproved: true } : u));
    } catch {}
  }

  const pendingVendors = users.filter((u) => u.role === 'vendor' && !u.isVendorApproved);

  const stats = [
    { label: tx.totalUsers, value: users.length || 0, Icon: Users, change: '+12' },
    { label: tx.totalVendors, value: users.filter((u) => u.role === 'vendor').length || 0, Icon: Store, change: '+3' },
    { label: tx.totalOrders, value: '1,240', Icon: ShoppingBag, change: '+48' },
    { label: tx.revenue, value: '$84,320', Icon: DollarSign, change: '+18%' },
  ];

  const roleLabel = (r: string) => ({ customer: tx.customer, vendor: tx.vendor, admin: tx.admin }[r] || r);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        <div>
          <h2 className="text-xl font-bold text-white">{tx.title}</h2>
          <p className="text-white/40 text-sm">{tx.subtitle}</p>
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

        {/* Pending vendor approvals */}
        {pendingVendors.length > 0 && (
          <div className="bg-[#112240] rounded-lg border border-yellow-500/20 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <h3 className="text-white font-semibold">{tx.pendingVendors}</h3>
              <span className="ml-auto rtl:mr-auto rtl:ml-0 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingVendors.length}
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {pendingVendors.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-xs">{u.fullName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{u.fullName}</p>
                      <p className="text-white/40 text-xs">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-yellow-400 text-xs">
                      <Clock className="w-3 h-3" />{tx.pending}
                    </span>
                    <button onClick={() => approveVendor(u.id)}
                      className="flex items-center gap-1 bg-green-500/15 text-green-400 hover:bg-green-500/25 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      data-testid={`button-approve-vendor-${u.id}`}>
                      <CheckCircle className="w-3 h-3" />{tx.approve}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All users table */}
        <div className="bg-[#112240] rounded-lg border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold">{tx.allUsers}</h3>
            <button className="text-primary text-sm hover:underline">{tx.viewAll}</button>
          </div>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-xs">
                    {[lang === 'en' ? 'User' : 'المستخدم', tx.role, tx.status, tx.joined, tx.actions].map((h) => (
                      <th key={h} className="text-left rtl:text-right px-5 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.slice(0, 10).map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary text-xs font-bold">{u.fullName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.fullName}</p>
                            <p className="text-white/40 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.role === 'admin' ? 'bg-purple-500/15 text-purple-400'
                          : u.role === 'vendor' ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-white/10 text-white/60'}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.isActive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                          {u.isActive ? (lang === 'en' ? 'Active' : 'نشط') : (lang === 'en' ? 'Inactive' : 'غير نشط')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white/50 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <button className="text-white/30 hover:text-primary transition-colors">
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
