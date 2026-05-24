import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Login() {
  const { login } = useAuth();
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tx = {
    en: {
      title: 'Sign in', subtitle: 'Welcome back to Orbit Market',
      email: 'Email address', password: 'Password', signIn: 'Sign in',
      forgot: 'Forgot password?', noAccount: "Don't have an account?",
      register: 'Create account', orContinue: 'Or continue with',
      demoAdmin: 'Demo: Admin', demoVendor: 'Demo: Vendor', demoCustomer: 'Demo: Customer',
    },
    ar: {
      title: 'تسجيل الدخول', subtitle: 'مرحباً بعودتك إلى سوق أوربت',
      email: 'البريد الإلكتروني', password: 'كلمة المرور', signIn: 'تسجيل الدخول',
      forgot: 'نسيت كلمة المرور؟', noAccount: 'ليس لديك حساب؟',
      register: 'إنشاء حساب', orContinue: 'أو المتابعة عبر',
      demoAdmin: 'تجريبي: مدير', demoVendor: 'تجريبي: بائع', demoCustomer: 'تجريبي: عميل',
    },
  }[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message || (lang === 'en' ? 'Login failed' : 'فشل تسجيل الدخول'));
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(role: 'admin' | 'vendor' | 'customer') {
    const creds = {
      admin:    { email: 'admin@orbit.market',    password: 'Admin1234!' },
      vendor:   { email: 'vendor@orbit.market',   password: 'Vendor1234!' },
      customer: { email: 'customer@orbit.market', password: 'Customer1234!' },
    }[role];
    setEmail(creds.email);
    setPassword(creds.password);
    setError('');
    setLoading(true);
    try {
      await login(creds.email, creds.password);
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex" dir={dir}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#112240] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-primary/30"
              style={{ width: `${(i+1)*180}px`, height: `${(i+1)*180}px`, top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="relative z-10 text-center space-y-6 max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto">
            <div className="w-8 h-8 rounded-full border-4 border-[#112240]" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            {lang === 'en' ? 'Orbit Market' : 'سوق أوربت'}
          </h1>
          <p className="text-white/60 leading-relaxed">
            {lang === 'en'
              ? 'The global premium marketplace connecting buyers and verified vendors worldwide.'
              : 'السوق العالمي المتميز الذي يربط المشترين بالبائعين المعتمدين حول العالم.'}
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { n: '50K+', l: lang === 'en' ? 'Products' : 'منتج' },
              { n: '2K+', l: lang === 'en' ? 'Vendors' : 'بائع' },
              { n: '120+', l: lang === 'en' ? 'Countries' : 'دولة' },
            ].map((s) => (
              <div key={s.n} className="bg-[#0A1628]/60 rounded-lg p-3">
                <p className="text-primary font-bold text-xl">{s.n}</p>
                <p className="text-white/50 text-xs">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-start rtl:lg:text-end">
            <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <div className="w-4 h-4 rounded-full border-2 border-[#0A1628]" />
              </div>
              <span className="text-white font-bold">{lang === 'en' ? 'Orbit Market' : 'سوق أوربت'}</span>
            </Link>
            <h2 className="text-2xl font-bold text-white">{tx.title}</h2>
            <p className="text-white/50 mt-1 text-sm">{tx.subtitle}</p>
          </div>

          {/* Demo quick-login */}
          <div className="mb-6 p-3 rounded-lg bg-[#112240] border border-white/10">
            <p className="text-white/50 text-xs mb-2 text-center">
              {lang === 'en' ? 'Quick demo access' : 'وصول تجريبي سريع'}
            </p>
            <div className="flex gap-2">
              {(['admin', 'vendor', 'customer'] as const).map((r) => (
                <button key={r} onClick={() => quickLogin(r)}
                  className="flex-1 text-xs py-1.5 rounded border border-primary/30 text-primary hover:bg-primary hover:text-[#0A1628] transition-colors font-medium"
                  data-testid={`button-demo-${r}`}>
                  {tx[`demo${r.charAt(0).toUpperCase() + r.slice(1)}` as 'demoAdmin']}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.email}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-[#112240] border border-white/10 focus:border-primary/60 text-white px-4 py-3 rounded-lg text-sm outline-none placeholder-white/30 transition-colors"
                placeholder="you@example.com" dir="ltr" data-testid="input-email" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">{tx.password}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-[#112240] border border-white/10 focus:border-primary/60 text-white px-4 py-3 rounded-lg text-sm outline-none placeholder-white/30 transition-colors pr-11 rtl:pr-4 rtl:pl-11"
                  placeholder="••••••••" data-testid="input-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end rtl:justify-start mt-1.5">
                <Link href="/forgot-password" className="text-primary text-xs hover:underline">{tx.forgot}</Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-[#0A1628] font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="button-submit-login">
              {loading ? <div className="w-4 h-4 border-2 border-[#0A1628] border-t-transparent rounded-full animate-spin" />
                : <LogIn className="w-4 h-4" />}
              {tx.signIn}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            {tx.noAccount}{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">{tx.register}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
