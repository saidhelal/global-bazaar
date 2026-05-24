import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, Loader2 } from 'lucide-react';

interface Props {
  orderId: number;
  total: number;
  currency: string;
  lang: 'en' | 'ar';
  onError: (msg: string) => void;
}

const T = {
  en: {
    pay: 'Pay',
    processing: 'Processing…',
    secured: 'Secured by Stripe · SSL encrypted',
    applePay: 'Apple Pay & Google Pay supported',
  },
  ar: {
    pay: 'ادفع',
    processing: 'جارٍ المعالجة…',
    secured: 'مؤمَّن بواسطة Stripe · تشفير SSL',
    applePay: 'يدعم Apple Pay و Google Pay',
  },
};

export default function StripePaymentForm({ orderId, total, currency, lang, onError }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const t = T[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/orders/${orderId}?payment=success`;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });
      if (error) {
        onError(error.message || 'Payment failed. Please try again.');
      }
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Payment error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
          fields: { billingDetails: 'never' },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3.5 bg-[#D4AF37] text-[#0A1628] font-bold rounded-xl hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.processing}
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            {t.pay} {currency} {total.toFixed(2)}
          </>
        )}
      </button>
      <div className="text-center space-y-1">
        <p className="text-white/30 text-xs flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> {t.secured}
        </p>
        <p className="text-white/20 text-xs">{t.applePay}</p>
      </div>
    </form>
  );
}
