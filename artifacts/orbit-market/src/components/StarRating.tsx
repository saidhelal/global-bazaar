import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (val: number) => void;
  showEmpty?: boolean;
}

const SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

export default function StarRating({ value, max = 5, size = 'md', interactive = false, onChange, showEmpty = true }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const cls = SIZE_MAP[size];
  const display = hovered > 0 ? hovered : value;

  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : undefined} aria-label={`Rating: ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const filled = star <= Math.round(display);
        return (
          <Star
            key={star}
            className={`${cls} transition-colors ${
              filled
                ? 'fill-[#D4AF37] text-[#D4AF37]'
                : showEmpty
                ? 'text-white/20'
                : 'text-transparent'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={interactive ? () => onChange?.(star) : undefined}
            onMouseEnter={interactive ? () => setHovered(star) : undefined}
            onMouseLeave={interactive ? () => setHovered(0) : undefined}
            role={interactive ? 'radio' : undefined}
          />
        );
      })}
    </div>
  );
}

export function RatingSummary({ average, total, distribution }: {
  average: string;
  total: number;
  distribution: Record<number, number>;
}) {
  const avg = parseFloat(average);
  return (
    <div className="flex gap-6 items-center">
      {/* Big number */}
      <div className="text-center flex-shrink-0">
        <div className="text-5xl font-bold text-white">{avg.toFixed(1)}</div>
        <StarRating value={avg} size="sm" />
        <div className="text-white/40 text-xs mt-1">{total.toLocaleString()} reviews</div>
      </div>

      {/* Bar chart */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {[5, 4, 3, 2, 1].map(star => {
          const cnt = distribution[star] || 0;
          const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-white/50 text-xs w-3 flex-shrink-0">{star}</span>
              <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37] flex-shrink-0" />
              <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#D4AF37] rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-white/30 text-xs w-6 text-right flex-shrink-0">{cnt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
