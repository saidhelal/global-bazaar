import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, UserPlus, Store, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Register() {
  const { register } = useAuth();
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();

  const [role, setRole] = useState<'customer' | 'vendor'>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tx = {
    en: {
      title: 'Create account', subtitle: 'Join millions of shoppers on Orbit Market',
      roleCustomer: 'Customer', roleVendor: 'Vendor',
      roleCustomerDesc: 'Shop premium products from verified vendors',
      roleVendorDesc: 'Sell your products to global customers',
      fullName: 'Full name', email: 'Email address', phone: 'Phone (optional)',
      password: 'Password', confirmPw: 'Confirm password',
      storeName: 'Store name', storeDesc: 'Store description', storeCat: 'Store category',
      submit: 'Create account', haveAccount: 'Already have an account?', signIn: 'Sign in',
      pwMismatch: 'Passwords do not match', pwShort: 'Password must be at least 8 characters',
    },
    ar: {
      title: 'إنشاء حساب', subtitle: 'انضم إلى ملايين المتسوقين في سوق أوربت',
      roleCustomer: 'عميل', roleVendor: 'بائع',
      roleCustomerDesc: 'تسوق منتجات مميزة من بائعين معتمدين',
      roleVendorDesc: 'بِع منتجاتك لعملاء حول العالم',
      fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'الهاتف (اختياري)',
      password: 'كلمة المرور', confirmPw: 'تأكيد كلمة المرور',
      storeName: 'اسم المتجر', storeDesc: 'وصف المتجر', storeCat: 'فئة المتجر',
      submit: 'إنشاء حساب', haveAccount: 'لديك حساب بالفعل؟', signIn: 'تسجيل الدخول',
      pwMismatch: 'كلمتا المرور غير متطابقتين', pwShort: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
    },
  }[lang];

  const categories = lang === 'en'
    ? ['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Books', 'Automotive', 'Other']
    : ['إلكترونيات', 'أزياء', 'المنزل والمعيشة', 'التجميل', 'الرياضة', 'كتب', 'السيارات', 'أخرى'];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPw) { setError(tx.pwMismatch); return; }
    if (password.length < 8) { setError(tx.pwShort); return; }
    setLoading(true);
    try {
      await register({ email, password, fullName, role, phone: phone || undefined,
        storeName: role === 'vendor' ? storeName : undefined,
        storeDescription: role === 'vendor' ? storeDescription : undefined,
        storeCategory: role === 'vendor' ? storeCategory : undefined });
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message || (lang === 'en' ? 'Registration failed' : 'فشل إنشاء الحساب'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6" dir={dir}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#0A1628]" />
            </div>
            <span className="text-white font-bold text-lg">{lang === 'en' ? 'Orbit Market' : 'سوق أوربت'}</span>
          </Link>
          <h2 className="text-2xl font-bold text-white">{tx.title}</h2>
          <p className="text-white/50 mt-1 text-sm">{tx.subtitle}</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['customer', 'vendor'] as const).map((r) => {
            const Icon = r === 'customer' ? User : Store;
            const label = r === 'customer' ? tx.roleCustomer : tx.roleVendor;
            const desc = r === 'customer' ? tx.roleCustomerDesc : tx.roleVendorDesc;
            return (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`p-4 rounded-lg border text-left rtl:text-right transition-all ${
                  role === r ? 'border-primary bg-primary/10' : 'border-white/10 bg-[#112240] hover:border-white/30'}`}
                data-testid={`button-role-${r}`}>
                <Icon className={`w-5 h-5 mb-2 ${role === r ? 'text-primary' : 'text-white/50'}`} />
                <p className={`font-semibold text-sm ${role === r ? 'text-primary' : 'text-white'}`}>{label}</p>
                <p className="text-white/40 text-xs mt-0.5 leading-snug">{desc}</p>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-[#112240] p-6 rounded-lg border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-white/70 text-sm mb-1.5">{tx.fullName}</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                data-testid="input-fullname" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.email}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                dir="ltr" data-testid="input-email" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.phone}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                dir="ltr" data-testid="input-phone" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.password}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none pr-10 rtl:pr-4 rtl:pl-10 transition-colors"
                  data-testid="input-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-white/40">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.confirmPw}</label>
              <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required
                className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                data-testid="input-confirm-password" />
            </div>
          </div>

          {/* Vendor extra fields */}
          {role === 'vendor' && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div>
                <label className="block text-white/70 text-sm mb-1.5">{tx.storeName}</label>
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required
                  className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  data-testid="input-store-name" />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1.5">{tx.storeCat}</label>
                <select value={storeCategory} onChange={(e) => setStoreCategory(e.target.value)} required
                  className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors appearance-none"
                  data-testid="select-store-category">
                  <option value="">—</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1.5">{tx.storeDesc}</label>
                <textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={2}
                  className="w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none resize-none transition-colors"
                  data-testid="input-store-description" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-[#0A1628] font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            data-testid="button-submit-register">
            {loading ? <div className="w-4 h-4 border-2 border-[#0A1628] border-t-transparent rounded-full animate-spin" />
              : <UserPlus className="w-4 h-4" />}
            {tx.submit}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm mt-5">
          {tx.haveAccount}{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">{tx.signIn}</Link>
        </p>
      </div>
    </div>
  );
}
