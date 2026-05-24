import { useState } from 'react';
import { ThumbsUp, CheckCircle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import StarRating from './StarRating';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../contexts/AuthContext';

export interface ReviewData {
  id: number;
  userId: number;
  rating: number;
  title?: string | null;
  titleAr?: string | null;
  body?: string | null;
  bodyAr?: string | null;
  vendorReply?: string | null;
  vendorReplyAr?: string | null;
  vendorRepliedAt?: string | null;
  helpfulCount: number;
  isVerifiedPurchase?: boolean;
  authorDisplay: string;
  authorInitial: string;
  createdAt: string;
}

interface ReviewCardProps {
  review: ReviewData;
  showReplyForm?: boolean;
  onVoted?: (id: number, newCount: number) => void;
}

function timeAgo(dateStr: string, lang: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (lang === 'ar') {
    if (diff < 86400) return 'اليوم';
    if (diff < 2592000) return `${Math.floor(diff / 86400)} يوم`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} شهر`;
    return `${Math.floor(diff / 31536000)} سنة`;
  }
  if (diff < 86400) return 'Today';
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

export default function ReviewCard({ review, showReplyForm = false, onVoted }: ReviewCardProps) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [voted, setVoted] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAr, setReplyAr] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyVisible, setReplyVisible] = useState(true);

  const title = (lang === 'ar' && review.titleAr) ? review.titleAr : review.title;
  const body = (lang === 'ar' && review.bodyAr) ? review.bodyAr : review.body;
  const vendorReply = (lang === 'ar' && review.vendorReplyAr) ? review.vendorReplyAr : review.vendorReply;

  async function handleVote() {
    if (!user || voted) return;
    try {
      const data = await apiFetch(`/reviews/${review.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful: true }),
      });
      setHelpfulCount(data.helpfulCount);
      setVoted(true);
      onVoted?.(review.id, data.helpfulCount);
    } catch {}
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await apiFetch(`/reviews/${review.id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText, replyAr }),
      });
      setReplyOpen(false);
    } catch {} finally {
      setReplying(false);
    }
  }

  return (
    <div className="bg-[#112240] border border-white/5 rounded-2xl p-5 space-y-3">
      {/* Author row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{review.authorInitial}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-semibold">{review.authorDisplay}</span>
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-1 text-green-400 text-[10px] font-semibold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <CheckCircle className="w-2.5 h-2.5" />
                  {lang === 'ar' ? 'شراء موثّق' : 'Verified Purchase'}
                </span>
              )}
            </div>
            <span className="text-white/30 text-xs">{timeAgo(review.createdAt, lang)}</span>
          </div>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>

      {/* Review content */}
      {title && <h4 className="text-white font-semibold text-sm">{title}</h4>}
      {body && <p className="text-white/60 text-sm leading-relaxed">{body}</p>}

      {/* Vendor reply */}
      {vendorReply && (
        <div className="bg-[#0A1628] border border-white/5 rounded-xl p-3 ml-0 rtl:mr-0">
          <button
            onClick={() => setReplyVisible(v => !v)}
            className="flex items-center gap-2 text-xs text-white/60 font-semibold mb-1.5 w-full text-left rtl:text-right"
          >
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            {lang === 'ar' ? 'رد البائع' : "Vendor Response"}
            {replyVisible ? <ChevronUp className="w-3 h-3 ml-auto rtl:mr-auto rtl:ml-0" /> : <ChevronDown className="w-3 h-3 ml-auto rtl:mr-auto rtl:ml-0" />}
          </button>
          {replyVisible && <p className="text-white/50 text-sm leading-relaxed">{vendorReply}</p>}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleVote}
          disabled={!user || voted}
          className={`flex items-center gap-1.5 text-xs transition-colors ${voted ? 'text-primary' : 'text-white/30 hover:text-white/60'} disabled:opacity-50`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          {lang === 'ar' ? 'مفيد' : 'Helpful'} {helpfulCount > 0 && `(${helpfulCount})`}
        </button>

        {/* Vendor reply button */}
        {showReplyForm && user && (user.role === 'vendor' || user.role === 'admin') && !review.vendorReply && (
          <button
            onClick={() => setReplyOpen(v => !v)}
            className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'الرد' : 'Reply'}
          </button>
        )}
      </div>

      {/* Vendor reply form */}
      {replyOpen && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={lang === 'ar' ? 'ردك (بالإنجليزية)...' : 'Your reply (English)...'}
            rows={3}
            className="w-full bg-[#0A1628] text-white text-sm border border-white/10 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/40 placeholder-white/20"
          />
          <textarea
            value={replyAr}
            onChange={e => setReplyAr(e.target.value)}
            placeholder="ردك (بالعربية)..."
            rows={2}
            dir="rtl"
            className="w-full bg-[#0A1628] text-white text-sm border border-white/10 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/40 placeholder-white/20"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setReplyOpen(false)} className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || replying}
              className="text-xs bg-primary text-[#0A1628] font-bold px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {replying ? '...' : lang === 'ar' ? 'إرسال الرد' : 'Post Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
