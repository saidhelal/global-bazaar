import { memo, useState, useCallback } from 'react';
import { ShoppingCart, Heart, Star, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { Product } from '../hooks/useProducts';

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/400/500';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

function ProductCard({ product, className = '' }: ProductCardProps) {
  const { lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem, isInCart, getQuantity } = useCart();
  const [wishlisted, setWishlisted] = useState(false);
  const [addedFx, setAddedFx] = useState(false);

  const inCart = isInCart(product.id);
  const qty = getQuantity(product.id);
  const title = (lang === 'ar' && product.titleAr) ? product.titleAr : product.title;
  const price = parseFloat(product.price);
  const compareAt = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
  const discount = product.discountPercent && product.discountPercent > 0 ? product.discountPercent : null;
  const rating = parseFloat(product.rating || '0');
  const reviewCount = product.reviewCount || 0;
  const lowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 5);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addItem({
      productId: product.id,
      title: product.title,
      titleAr: product.titleAr,
      price,
      image: product.coverImage,
      vendorId: product.vendorId,
      stock: product.stock,
    });
    setAddedFx(true);
    setTimeout(() => setAddedFx(false), 1200);
  }, [product, price, addItem]);

  const handleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlisted(v => !v);
  }, []);

  return (
    <Link href={`/products/${product.id}`}>
      <article
        className={`group relative bg-[#112240] border border-white/[0.07] rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-250 hover:-translate-y-0.5 hover:border-[#D4AF37]/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(212,175,55,0.15)] ${className}`}
        aria-label={title}
      >
        {/* Badges row */}
        <div className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 z-10 flex flex-col gap-1.5" aria-hidden="true">
          {discount && (
            <span className="bg-[#D4AF37] text-[#0A1628] text-[10px] font-extrabold px-2 py-0.5 rounded-full leading-tight tracking-wide">
              -{discount}%
            </span>
          )}
          {product.isFeatured && !discount && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
              {lang === 'ar' ? 'مميز' : 'Featured'}
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
              {lang === 'ar' ? 'نفد المخزون' : 'Out of Stock'}
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm
            ${wishlisted
              ? 'bg-red-500/90 text-white scale-100'
              : 'bg-black/30 text-white/60 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-black/50'
            }`}
          aria-label={wishlisted
            ? (lang === 'ar' ? 'إزالة من المفضلة' : 'Remove from wishlist')
            : (lang === 'ar' ? 'أضف للمفضلة' : 'Add to wishlist')}
          aria-pressed={wishlisted}
        >
          <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-white' : ''}`} />
        </button>

        {/* Product image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#0D1E38] to-[#112240]">
          <img
            src={getImgUrl(product.coverImage)}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
            decoding="async"
            width={400}
            height={400}
            onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/400/400'; }}
          />
          {/* Subtle gradient at bottom of image */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#112240] to-transparent opacity-80" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3 pt-2.5 gap-1.5">
          {/* Category label */}
          <p className="text-[#D4AF37]/60 text-[9px] font-semibold uppercase tracking-[0.08em] truncate" aria-hidden="true">
            {product.category}
          </p>

          {/* Title */}
          <h3
            className="text-white/90 text-sm font-medium leading-snug line-clamp-2 flex-1"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            {title}
          </h3>

          {/* Rating */}
          {rating > 0 && (
            <div className="flex items-center gap-1.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
              <div className="flex items-center" aria-hidden="true">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'fill-white/10 text-white/10'}`} />
                ))}
              </div>
              {reviewCount > 0 && (
                <span className="text-white/40 text-[10px]">({reviewCount >= 1000 ? `${(reviewCount/1000).toFixed(1)}k` : reviewCount})</span>
              )}
            </div>
          )}

          {/* Price row */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[#D4AF37] font-bold text-base leading-none">{formatPrice(price)}</span>
            {compareAt && compareAt > price && (
              <span className="text-white/25 text-xs line-through leading-none" aria-label={`Original price ${formatPrice(compareAt)}`}>
                {formatPrice(compareAt)}
              </span>
            )}
          </div>

          {/* Low stock warning */}
          {lowStock && (
            <p className="flex items-center gap-1 text-orange-400/90 text-[10px] font-medium" role="alert">
              <Zap className="w-2.5 h-2.5 fill-orange-400/90" aria-hidden="true" />
              {lang === 'ar' ? `${product.stock} قطع متبقية فقط` : `Only ${product.stock} left`}
            </p>
          )}

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            aria-label={inCart
              ? (lang === 'ar' ? `في السلة — ${qty} قطعة` : `In cart — ${qty} item${qty !== 1 ? 's' : ''}`)
              : (lang === 'ar' ? `أضف ${title} للسلة` : `Add ${title} to cart`)}
            className={`mt-0.5 w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 min-h-[36px]
              ${product.stock === 0
                ? 'bg-white/5 text-white/25 cursor-not-allowed'
                : addedFx
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 scale-[0.98]'
                  : inCart
                    ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25'
                    : 'bg-[#D4AF37] text-[#0A1628] hover:bg-[#c9a432] active:scale-[0.98]'
              }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            {addedFx
              ? (lang === 'ar' ? '✓ تمت الإضافة' : '✓ Added')
              : inCart
                ? (lang === 'ar' ? `في السلة (${qty})` : `In Cart (${qty})`)
                : (lang === 'ar' ? 'أضف للسلة' : 'Add to Cart')
            }
          </button>
        </div>
      </article>
    </Link>
  );
}

// memo: skip re-render when parent re-renders but this product's props haven't changed
export default memo(ProductCard);

export function ProductCardSkeleton() {
  return (
    <div className="bg-[#112240] border border-white/[0.07] rounded-2xl overflow-hidden" aria-hidden="true">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2.5">
        <div className="h-2.5 skeleton rounded w-1/3" />
        <div className="h-3.5 skeleton rounded w-full" />
        <div className="h-3.5 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-5 skeleton rounded w-1/3" />
        <div className="h-8 skeleton rounded-xl w-full" />
      </div>
    </div>
  );
}
