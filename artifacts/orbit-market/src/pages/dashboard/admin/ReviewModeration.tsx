import { useState, useEffect } from 'react';
import { Check, X, Star, Eye, Filter, ChevronDown, MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import DashboardLayout from '../DashboardLayout';
import StarRating from '../../../components/StarRating';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

interface AdminReview {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: string;
  rejectionReason?: string | null;
  helpfulCount: number;
  createdAt: string;
  productTitle: string;
  authorName: string;
  authorEmail: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function ReviewModeration() {
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = filter !== 'all' ? `?status=${filter}` : '';
    apiFetch(`/reviews/admin${qs}`)
      .then(d => setReviews(d.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  async function approve(id: number) {
    setActionId(id);
    try {
      await apiFetch(`/reviews/admin/${id}/approve`, { method: 'PUT' });
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    } catch {} finally {
      setActionId(null);
    }
  }

  async function reject() {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionId(rejectModal.id);
    try {
      await apiFetch(`/reviews/admin/${rejectModal.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setReviews(prev => prev.map(r => r.id === rejectModal.id ? { ...r, status: 'rejected', rejectionReason: rejectReason } : r));
      setRejectModal(null);
      setRejectReason('');
    } catch {} finally {
      setActionId(null);
    }
  }

  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
  };

  const displayed = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);

  const filters: { key: StatusFilter; label: { en: string; ar: string } }[] = [
    { key: 'pending',  label: { en: 'Pending',  ar: 'بانتظار المراجعة' } },
    { key: 'approved', label: { en: 'Approved', ar: 'معتمدة' } },
    { key: 'rejected', label: { en: 'Rejected', ar: 'مرفوضة' } },
    { key: 'all',      label: { en: 'All',      ar: 'الكل' } },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">{lang === 'ar' ? 'إشراف المراجعات' : 'Review Moderation'}</h1>
          <p className="text-white/40 text-sm mt-0.5">{lang === 'ar' ? 'راجع واعتمد أو ارفض مراجعات العملاء' : 'Review, approve, or reject customer reviews'}</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-primary text-[#0A1628]' : 'bg-[#112240] text-white/50 hover:text-white border border-white/5'}`}
            >
              {f.label[lang]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-36 bg-[#112240] rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 bg-[#112240] rounded-2xl border border-white/5">
            <Star className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/50 font-medium">{lang === 'ar' ? 'لا توجد مراجعات' : 'No reviews to show'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(r => (
              <div key={r.id} className={`bg-[#112240] border rounded-2xl p-5 ${r.status === 'pending' ? 'border-yellow-500/20' : r.status === 'approved' ? 'border-green-500/15' : 'border-red-500/15'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Author + product */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-[10px]">{r.authorName.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-white text-sm font-semibold">{r.authorName}</span>
                      <span className="text-white/30 text-xs">{r.authorEmail}</span>
                      <span className="text-white/20 text-xs">→</span>
                      <Link href={`/products/${r.productId}`} className="text-primary text-xs hover:underline line-clamp-1">{r.productTitle}</Link>
                    </div>

                    {/* Rating + status */}
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating value={r.rating} size="sm" />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400'
                        : r.status === 'approved' ? 'bg-green-500/15 text-green-400'
                        : 'bg-red-500/15 text-red-400'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                      <span className="text-white/25 text-xs">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Review content */}
                    {r.title && <p className="text-white text-sm font-semibold mb-0.5">{r.title}</p>}
                    {r.body && <p className="text-white/55 text-sm leading-relaxed line-clamp-3">{r.body}</p>}
                    {r.rejectionReason && (
                      <p className="text-red-400/70 text-xs mt-1.5 italic">
                        {lang === 'ar' ? 'سبب الرفض:' : 'Rejection reason:'} {r.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {r.status !== 'approved' && (
                      <button
                        onClick={() => approve(r.id)}
                        disabled={actionId === r.id}
                        className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-green-500/20 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'اعتماد' : 'Approve'}
                      </button>
                    )}
                    {r.status !== 'rejected' && (
                      <button
                        onClick={() => setRejectModal({ id: r.id })}
                        disabled={actionId === r.id}
                        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'رفض' : 'Reject'}
                      </button>
                    )}
                    <Link href={`/products/${r.productId}#reviews`} className="flex items-center gap-1.5 text-white/30 hover:text-white text-xs px-2 py-1.5 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'عرض' : 'View'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#112240] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">{lang === 'ar' ? 'رفض المراجعة' : 'Reject Review'}</h3>
            <p className="text-white/50 text-sm mb-4">{lang === 'ar' ? 'يرجى تقديم سبب لإعلام المراجع.' : 'Please provide a reason to inform the reviewer.'}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: يحتوي على محتوى غير ملائم...' : 'e.g. Contains inappropriate content...'}
              rows={3}
              className="w-full bg-[#0A1628] text-white text-sm border border-white/10 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary/40 placeholder-white/20 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 bg-white/5 text-white/60 font-semibold py-2 rounded-xl text-sm hover:bg-white/10 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={reject}
                disabled={!rejectReason.trim() || actionId !== null}
                className="flex-1 bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-2 rounded-xl text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {lang === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
