import { useState, useEffect } from 'react';
import { Star, Package, Trash2, Edit, MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import DashboardLayout from '../DashboardLayout';
import StarRating from '../../../components/StarRating';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/80/80';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

interface MyReview {
  id: number;
  productId: number;
  rating: number;
  title?: string | null;
  titleAr?: string | null;
  body?: string | null;
  bodyAr?: string | null;
  status: string;
  vendorReply?: string | null;
  vendorReplyAr?: string | null;
  helpfulCount: number;
  createdAt: string;
  productTitle: string;
  productTitleAr?: string | null;
  productCoverImage?: string | null;
}

const STATUS_CONFIG = {
  pending:  { en: 'Pending',  ar: 'قيد المراجعة', color: 'text-yellow-400 bg-yellow-500/10',  Icon: Clock },
  approved: { en: 'Published', ar: 'منشور',        color: 'text-green-400 bg-green-500/10',   Icon: CheckCircle },
  rejected: { en: 'Rejected', ar: 'مرفوض',        color: 'text-red-400 bg-red-500/10',       Icon: XCircle },
};

export default function MyReviews() {
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch('/reviews/my')
      .then(d => setReviews(d.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذه المراجعة؟' : 'Delete this review?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/reviews/${id}`, { method: 'DELETE' });
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch {} finally {
      setDeletingId(null);
    }
  }

  const tx = {
    en: { title: 'My Reviews', subtitle: 'Reviews you have written', empty: 'No reviews yet', emptyHint: 'Start shopping and share your thoughts about products.', delete: 'Delete', viewProduct: 'View Product', vendorReplied: 'Vendor replied', helpful: 'people found this helpful' },
    ar: { title: 'مراجعاتي', subtitle: 'المراجعات التي كتبتها', empty: 'لا توجد مراجعات بعد', emptyHint: 'ابدأ التسوق وشارك آراءك حول المنتجات.', delete: 'حذف', viewProduct: 'عرض المنتج', vendorReplied: 'رد البائع', helpful: 'وجدوا هذا مفيداً' },
  }[lang];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">{tx.title}</h1>
          <p className="text-white/40 text-sm mt-0.5">{tx.subtitle}</p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-[#112240] rounded-2xl" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 bg-[#112240] rounded-2xl border border-white/5">
            <Star className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/50 font-medium">{tx.empty}</p>
            <p className="text-white/25 text-sm mt-1">{tx.emptyHint}</p>
            <Link href="/products" className="inline-block mt-4 bg-primary text-[#0A1628] text-sm font-bold px-5 py-2 rounded-xl">
              {lang === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => {
              const statusCfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const pTitle = (lang === 'ar' && r.productTitleAr) ? r.productTitleAr : r.productTitle;
              const rTitle = (lang === 'ar' && r.titleAr) ? r.titleAr : r.title;
              const rBody = (lang === 'ar' && r.bodyAr) ? r.bodyAr : r.body;
              const vReply = (lang === 'ar' && r.vendorReplyAr) ? r.vendorReplyAr : r.vendorReply;
              return (
                <div key={r.id} className="bg-[#112240] border border-white/5 rounded-2xl p-5">
                  {/* Product row */}
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={getImgUrl(r.productCoverImage)}
                      alt={pTitle}
                      className="w-14 h-14 rounded-xl object-cover bg-[#0A1628] flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/p/80/80'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${r.productId}`} className="text-white text-sm font-semibold hover:text-primary transition-colors line-clamp-1">
                        {pTitle}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <StarRating value={r.rating} size="xs" />
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                          <statusCfg.Icon className="w-2.5 h-2.5" />
                          {statusCfg[lang]}
                        </span>
                        {r.helpfulCount > 0 && (
                          <span className="text-white/25 text-[10px]">{r.helpfulCount} {tx.helpful}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Review content */}
                  {rTitle && <h4 className="text-white text-sm font-semibold mb-1">{rTitle}</h4>}
                  {rBody && <p className="text-white/55 text-sm leading-relaxed">{rBody}</p>}

                  {/* Vendor reply */}
                  {vReply && (
                    <div className="mt-3 bg-[#0A1628] border border-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-xs text-primary/70 font-semibold mb-1">
                        <MessageSquare className="w-3 h-3" />
                        {tx.vendorReplied}
                      </div>
                      <p className="text-white/50 text-xs leading-relaxed">{vReply}</p>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-white/20 text-xs mt-3">
                    {new Date(r.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
