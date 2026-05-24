import { useState } from 'react';
import { Send, X } from 'lucide-react';
import StarRating from './StarRating';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../contexts/AuthContext';

interface ReviewFormProps {
  productId: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({ productId, onSuccess, onCancel }: ReviewFormProps) {
  const { lang } = useLanguage();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [body, setBody] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const tx = {
    en: {
      heading: 'Write a Review',
      ratingLabel: 'Your Rating',
      titleLabel: 'Title (English)',
      titleArLabel: 'Title (Arabic — optional)',
      bodyLabel: 'Your Review (English)',
      bodyArLabel: 'Your Review (Arabic — optional)',
      titlePlaceholder: 'Summarise your experience...',
      bodyPlaceholder: 'Tell others what you think about this product...',
      submit: 'Submit Review',
      pending: 'Your review will appear after moderation.',
      ratingRequired: 'Please select a star rating before submitting.',
    },
    ar: {
      heading: 'اكتب مراجعة',
      ratingLabel: 'تقييمك',
      titleLabel: 'العنوان (بالإنجليزية)',
      titleArLabel: 'العنوان (بالعربية — اختياري)',
      bodyLabel: 'مراجعتك (بالإنجليزية)',
      bodyArLabel: 'مراجعتك (بالعربية — اختياري)',
      titlePlaceholder: 'لخّص تجربتك...',
      bodyPlaceholder: 'أخبر الآخرين برأيك في هذا المنتج...',
      submit: 'إرسال المراجعة',
      pending: 'ستظهر مراجعتك بعد المراجعة من الإدارة.',
      ratingRequired: 'يرجى اختيار تقييم نجمي قبل الإرسال.',
    },
  }[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError(tx.ratingRequired); return; }
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, title: title || undefined, titleAr: titleAr || undefined, body: body || undefined, bodyAr: bodyAr || undefined }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || (lang === 'ar' ? 'فشل إرسال المراجعة.' : 'Failed to submit review.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#112240] border border-white/5 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-base">{tx.heading}</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Star picker */}
      <div>
        <label className="text-white/60 text-xs font-medium block mb-1.5">{tx.ratingLabel}</label>
        <StarRating value={rating} size="lg" interactive onChange={setRating} />
        {rating > 0 && (
          <span className="text-primary text-xs mt-1 block">
            {['', lang === 'ar' ? 'رديء' : 'Poor', lang === 'ar' ? 'مقبول' : 'Fair', lang === 'ar' ? 'جيد' : 'Good', lang === 'ar' ? 'جيد جداً' : 'Very Good', lang === 'ar' ? 'ممتاز' : 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Title EN */}
      <div>
        <label className="text-white/60 text-xs font-medium block mb-1">{tx.titleLabel}</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={tx.titlePlaceholder}
          maxLength={120}
          className="w-full bg-[#0A1628] text-white text-sm border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-primary/40 placeholder-white/20"
        />
      </div>

      {/* Body EN */}
      <div>
        <label className="text-white/60 text-xs font-medium block mb-1">{tx.bodyLabel}</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={tx.bodyPlaceholder}
          rows={4}
          maxLength={2000}
          className="w-full bg-[#0A1628] text-white text-sm border border-white/10 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/40 placeholder-white/20"
        />
        <span className="text-white/20 text-[10px]">{body.length}/2000</span>
      </div>

      {/* Arabic fields */}
      <details className="group">
        <summary className="text-xs text-primary/70 hover:text-primary cursor-pointer select-none">
          {lang === 'ar' ? '+ أضف نسخة عربية' : '+ Add Arabic version (optional)'}
        </summary>
        <div className="space-y-3 mt-3">
          <div>
            <label className="text-white/60 text-xs font-medium block mb-1">{tx.titleArLabel}</label>
            <input
              value={titleAr}
              onChange={e => setTitleAr(e.target.value)}
              placeholder="عنوان مراجعتك..."
              dir="rtl"
              maxLength={120}
              className="w-full bg-[#0A1628] text-white text-sm border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-primary/40 placeholder-white/20"
            />
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium block mb-1">{tx.bodyArLabel}</label>
            <textarea
              value={bodyAr}
              onChange={e => setBodyAr(e.target.value)}
              placeholder="اكتب مراجعتك بالعربية..."
              dir="rtl"
              rows={3}
              maxLength={2000}
              className="w-full bg-[#0A1628] text-white text-sm border border-white/10 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/40 placeholder-white/20"
            />
          </div>
        </div>
      </details>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      <p className="text-white/25 text-xs">{tx.pending}</p>

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full flex items-center justify-center gap-2 bg-primary text-[#0A1628] font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {submitting ? '...' : tx.submit}
      </button>
    </form>
  );
}
