import { useState } from 'react';
import { useAuth, apiFetch } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from './dashboard/DashboardLayout';
import { User, Store, Lock, CheckCircle } from 'lucide-react';

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { lang, dir } = useLanguage();

  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'password'>('profile');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [storeDescription, setStoreDescription] = useState(user?.storeDescription || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const tx = {
    en: {
      title: 'Account Settings', profileTab: 'Profile', storeTab: 'Store', passwordTab: 'Password',
      fullName: 'Full name', email: 'Email address', phone: 'Phone',
      storeName: 'Store name', storeDesc: 'Store description', storeCategory: 'Store category',
      currentPw: 'Current password', newPw: 'New password', confirmPw: 'Confirm new password',
      save: 'Save changes', saving: 'Saving...', saved: 'Changes saved!',
      pwMismatch: 'Passwords do not match', pwShort: 'Minimum 8 characters',
      role: 'Role', memberSince: 'Member since',
    },
    ar: {
      title: 'إعدادات الحساب', profileTab: 'الملف الشخصي', storeTab: 'المتجر', passwordTab: 'كلمة المرور',
      fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'الهاتف',
      storeName: 'اسم المتجر', storeDesc: 'وصف المتجر', storeCategory: 'فئة المتجر',
      currentPw: 'كلمة المرور الحالية', newPw: 'كلمة المرور الجديدة', confirmPw: 'تأكيد كلمة المرور الجديدة',
      save: 'حفظ التغييرات', saving: 'جاري الحفظ...', saved: 'تم الحفظ!',
      pwMismatch: 'كلمتا المرور غير متطابقتين', pwShort: '8 أحرف على الأقل',
      role: 'الدور', memberSince: 'عضو منذ',
    },
  }[lang];

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const data = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ fullName, phone }) });
      updateUser(data.user);
      setSuccess(tx.saved);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function saveStore(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const data = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ storeName, storeDescription }) });
      updateUser(data.user);
      setSuccess(tx.saved);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPw !== confirmPw) { setError(tx.pwMismatch); return; }
    if (newPw.length < 8) { setError(tx.pwShort); return; }
    setSaving(true);
    try {
      await apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) });
      setSuccess(tx.saved); setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  const tabs = [
    { id: 'profile' as const, label: tx.profileTab, Icon: User },
    ...(user?.role === 'vendor' ? [{ id: 'store' as const, label: tx.storeTab, Icon: Store }] : []),
    { id: 'password' as const, label: tx.passwordTab, Icon: Lock },
  ];

  const inputCls = "w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors disabled:opacity-50";

  return (
    <DashboardLayout>
      <div className="max-w-2xl" dir={dir}>
        <h2 className="text-xl font-bold text-white mb-6">{tx.title}</h2>

        {/* Avatar & summary */}
        <div className="bg-[#112240] rounded-lg p-5 border border-white/5 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-2xl">{user?.fullName?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user?.fullName}</p>
            <p className="text-white/40 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
              <span className="text-white/30 text-xs">
                {tx.memberSince} {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#112240] p-1 rounded-lg mb-6 border border-white/5">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => { setActiveTab(id); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-primary text-[#0A1628]' : 'text-white/50 hover:text-white'}`}
              data-testid={`tab-${id}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Feedback */}
        {success && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <form onSubmit={saveProfile} className="bg-[#112240] rounded-lg p-6 border border-white/5 space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.fullName}</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputCls} data-testid="input-fullname" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.email}</label>
              <input type="email" value={user?.email} disabled className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.phone}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} dir="ltr" data-testid="input-phone" />
            </div>
            <button type="submit" disabled={saving}
              className="bg-primary text-[#0A1628] font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              data-testid="button-save-profile">
              {saving ? tx.saving : tx.save}
            </button>
          </form>
        )}

        {/* Store tab (vendor only) */}
        {activeTab === 'store' && user?.role === 'vendor' && (
          <form onSubmit={saveStore} className="bg-[#112240] rounded-lg p-6 border border-white/5 space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.storeName}</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className={inputCls} data-testid="input-store-name" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.storeDesc}</label>
              <textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={4}
                className={`${inputCls} resize-none`} data-testid="input-store-description" />
            </div>
            <button type="submit" disabled={saving}
              className="bg-primary text-[#0A1628] font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              data-testid="button-save-store">
              {saving ? tx.saving : tx.save}
            </button>
          </form>
        )}

        {/* Password tab */}
        {activeTab === 'password' && (
          <form onSubmit={savePassword} className="bg-[#112240] rounded-lg p-6 border border-white/5 space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.currentPw}</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required className={inputCls} data-testid="input-current-password" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.newPw}</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required className={inputCls} data-testid="input-new-password" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.confirmPw}</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required className={inputCls} data-testid="input-confirm-password" />
            </div>
            <button type="submit" disabled={saving}
              className="bg-primary text-[#0A1628] font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              data-testid="button-save-password">
              {saving ? tx.saving : tx.save}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
