import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '../../contexts/AuthContext';

interface Props {
  iframeUrl: string;
  orderId: number;
  lang: 'en' | 'ar';
  onSuccess: () => void;
  onClose: () => void;
}

const T = {
  en: {
    title: 'Complete Payment — Paymob',
    success: 'Payment Successful!',
    failed: 'Payment Failed',
    tryAgain: 'Try Again',
    checking: 'Verifying payment…',
  },
  ar: {
    title: 'إتمام الدفع — Paymob',
    success: 'تمت عملية الدفع بنجاح!',
    failed: 'فشلت عملية الدفع',
    tryAgain: 'حاول مجدداً',
    checking: 'جارٍ التحقق من الدفع…',
  },
};

export default function PaymobModal({ iframeUrl, orderId, lang, onSuccess, onClose }: Props) {
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed'>('waiting');
  const t = T[lang];

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/payments/status/${orderId}`);
        if (data.paymentStatus === 'paid') {
          setStatus('success');
          clearInterval(interval);
          setTimeout(onSuccess, 1800);
        } else if (data.paymentStatus === 'failed') {
          setStatus('failed');
          clearInterval(interval);
        }
      } catch { /* keep polling */ }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderId, onSuccess]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#112240] rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src="https://accept.paymob.com/assets/images/paymob-logo.png" alt="Paymob" className="h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h3 className="text-white font-bold text-sm">{t.title}</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-500/10 border-2 border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-white font-bold text-lg">{t.success}</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-white/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.checking}
            </div>
          </div>
        ) : status === 'failed' ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white font-bold text-lg">{t.failed}</p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 border border-white/20 text-white rounded-xl hover:bg-white/5 transition-colors text-sm"
            >
              {t.tryAgain}
            </button>
          </div>
        ) : (
          <iframe
            src={iframeUrl}
            className="w-full border-0"
            style={{ height: '530px' }}
            title="Paymob Payment"
            allow="payment"
          />
        )}
      </div>
    </div>
  );
}
