import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, PenLine, SlidersHorizontal } from 'lucide-react';
import { apiFetch } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import StarRating, { RatingSummary } from './StarRating';
import ReviewCard, { type ReviewData } from './ReviewCard';
import ReviewForm from './ReviewForm';

interface ReviewSummary {
  average: string;
  total: number;
  distribution: Record<number, number>;
}

interface ProductReviewsProps {
  productId: number;
  vendorId?: number;
}

type SortOption = 'newest' | 'highest' | 'lowest' | 'helpful';

export default function ProductReviews({ productId, vendorId }: ProductReviewsProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ average: '0', total: 0, distribution: { 1:0,2:0,3:0,4:0,5:0 } });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('newest');
  const [showForm, setShowForm] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/reviews/product/${productId}?sort=${sort}&limit=20`);
      setReviews(data.reviews || []);
      setSummary(data.summary || { average: '0', total: 0, distribution: {} });
      // Check if current user already reviewed
      if (user) {
        setHasReviewed((data.reviews || []).some((r: ReviewData) => r.userId === user.id));
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [productId, sort, user]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  function handleFormSuccess() {
    setShowForm(false);
    setSubmitSuccess(true);
    setHasReviewed(true);
  }

  const isVendorOfProduct = user?.role === 'vendor' && user?.id === vendorId;
  const canReview = user && user.role !== 'admin' && !isVendorOfProduct && !hasReviewed;

  const tx = {
    en: {
      heading: 'Customer Reviews',
      writeReview: 'Write a Review',
      noReviews: 'No reviews yet',
      noReviewsHint: 'Be the first to share your thoughts on this product.',
      sortBy: 'Sort by',
      newest: 'Newest', highest: 'Highest Rated', lowest: 'Lowest Rated', helpful: 'Most Helpful',
      submitted: '✓ Review submitted! It will appear after moderation.',
      alreadyReviewed: 'You have already reviewed this product.',
      signIn: 'Sign in to write a review',
    },
    ar: {
      heading: 'مراجعات العملاء',
      writeReview: 'اكتب مراجعة',
      noReviews: 'لا توجد مراجعات حتى الآن',
      noReviewsHint: 'كن أول من يشارك رأيه في هذا المنتج.',
      sortBy: 'ترتيب حسب',
      newest: 'الأحدث', highest: 'الأعلى تقييماً', lowest: 'الأقل تقييماً', helpful: 'الأكثر فائدة',
      submitted: '✓ تم إرسال مراجعتك! ستظهر بعد المراجعة من الإدارة.',
      alreadyReviewed: 'لقد قمت بالفعل بمراجعة هذا المنتج.',
      signIn: 'سجل الدخول لكتابة مراجعة',
    },
  }[lang];

  return (
    <section id="reviews" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-bold text-xl">{tx.heading}</h2>
          {summary.total > 0 && (
            <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{summary.total}</span>
          )}
        </div>

        {canReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <PenLine className="w-4 h-4" />
            {tx.writeReview}
          </button>
        )}
      </div>

      {/* Success banner */}
      {submitSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl">
          {tx.submitted}
        </div>
      )}

      {/* Already reviewed */}
      {hasReviewed && !submitSuccess && user && (
        <div className="text-white/40 text-sm">{tx.alreadyReviewed}</div>
      )}

      {/* Sign in prompt */}
      {!user && (
        <div className="text-white/40 text-sm">
          <a href="/login" className="text-primary hover:underline">{tx.signIn}</a>
        </div>
      )}

      {/* Rating summary */}
      {summary.total > 0 && (
        <div className="bg-[#112240] border border-white/5 rounded-2xl p-5">
          <RatingSummary average={summary.average} total={summary.total} distribution={summary.distribution} />
        </div>
      )}

      {/* Write review form */}
      {showForm && canReview && (
        <ReviewForm productId={productId} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
      )}

      {/* Sort controls */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-white/40" />
          <span className="text-white/40 text-xs">{tx.sortBy}:</span>
          {(['newest', 'highest', 'lowest', 'helpful'] as SortOption[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${sort === s ? 'bg-primary/15 text-primary font-semibold' : 'text-white/40 hover:text-white bg-white/5'}`}
            >
              {tx[s]}
            </button>
          ))}
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-[#112240] rounded-2xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-[#112240] border border-white/5 rounded-2xl">
          <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/50 font-medium">{tx.noReviews}</p>
          <p className="text-white/25 text-sm mt-1">{tx.noReviewsHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              showReplyForm={isVendorOfProduct || user?.role === 'admin'}
              onVoted={(id, cnt) => setReviews(prev => prev.map(rv => rv.id === id ? { ...rv, helpfulCount: cnt } : rv))}
            />
          ))}
        </div>
      )}
    </section>
  );
}
