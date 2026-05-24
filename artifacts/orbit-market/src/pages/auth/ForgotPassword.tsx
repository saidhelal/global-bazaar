import { useState } from 'react';
import { Link } from 'wouter';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch } from '../../contexts/AuthContext';

export default function ForgotPassword() {
  const { lang, dir } = useLanguage();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tx = {
    en: {
      title: 'Reset your password', subtitle: 'Enter your email and we\'ll send you a reset link.',
      email: 'Email address', submit: 'Send reset link', back: 'Back to sign in',
      successTitle: 'Check your email', successMsg: 'If that email is registered, a reset link has been sent.',
    },
    ar: {
      title: 'إعادة تعيين كلمة المرور', subtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.',
      email: 'البريد الإلكتروني', submit: 'إرسال رابط إعادة التعيين', back: 'العودة لتسجيل الدخول',
      successTitle: 'تحقق من بريدك الإلكتروني', successMsg: 'إذا كان البريد مسجلاً، فسيتم إرسال رابط إعادة التعيين.',
    },
  }[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err: any) {
      setError(err.message || (lang === 'en' ? 'Request failed' : 'فشل الطلب'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6" dir={dir}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#0A1628]" />
            </div>
            <span className="text-white font-bold text-lg">{lang === 'en' ? 'Orbit Market' : 'سوق أوربت'}</span>
          </Link>

          {sent ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{tx.successTitle}</h2>
              <p className="text-white/50 mt-2 text-sm max-w-xs mx-auto">{tx.successMsg}</p>
              <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline text-sm">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {tx.back}
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-white">{tx.title}</h2>
              <p className="text-white/50 mt-2 text-sm">{tx.subtitle}</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left rtl:text-right">
                <div>
                  <label className="block text-white/70 text-sm mb-1.5">{tx.email}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full bg-[#112240] border border-white/10 focus:border-primary/60 text-white px-4 py-3 rounded-lg text-sm outline-none transition-colors"
                    dir="ltr" data-testid="input-email" />
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-[#0A1628] font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  data-testid="button-submit-forgot">
                  {loading && <div className="w-4 h-4 border-2 border-[#0A1628] border-t-transparent rounded-full animate-spin" />}
                  {tx.submit}
                </button>
                <div className="text-center">
                  <Link href="/login" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm">
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    {tx.back}
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
