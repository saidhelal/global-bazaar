import { ShoppingCart, Star } from 'lucide-react';
import { Link } from 'wouter';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { Product } from '../hooks/useProducts';

function StarRating({ rating, count }: { rating: string | null | undefined; count: number | null | undefined }) {
  const r = parseFloat(rating || '0');
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(r) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-white/20'}`} />
        ))}
      </div>
      <span className="text-white/50 text-xs">({count || 0})</span>
    </div>
  );
}

function getImgUrl(path: string | null | undefined) {
  if (!path) return 'https://picsum.photos/seed/product/400/400';
  if (path.startsWith('http')) return path;
  const base = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '');
  return `${base}/api/storage${path}`;
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = '' }: ProductCardProps) {
  const { lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem, isInCart, getQuantity } = useCart();
  const inCart = isInCart(product.id);
  const qty = getQuantity(product.id);

  const title = (lang === 'ar' && product.titleAr) ? product.titleAr : product.title;
  const price = parseFloat(product.price);
  const compareAt = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
  const discount = product.discountPercent && product.discountPercent > 0 ? product.discountPercent : null;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      title: product.title,
      titleAr: product.titleAr,
      price,
      image: product.coverImage,
      vendorId: product.vendorId,
      stock: product.stock,
    });
  }

  return (
    <Link href={`/products/${product.id}`}>
      <div className={`group relative bg-[#112240] border border-white/5 rounded-xl overflow-hidden hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/5 transition-all duration-200 cursor-pointer flex flex-col ${className}`}>
        {/* Badges */}
        <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 z-10 flex flex-col gap-1">
          {discount && (
            <span className="bg-[#D4AF37] text-[#0A1628] text-[10px] font-bold px-2 py-0.5 rounded">-{discount}%</span>
          )}
          {product.isFeatured && (
            <span className="bg-blue-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">Featured</span>
          )}
          {product.stock === 0 && (
            <span className="bg-red-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">Out of stock</span>
          )}
        </div>

        {/* Image */}
        <div className="aspect-square overflow-hidden bg-[#0A1628]/40">
          <img
            src={getImgUrl(product.coverImage)}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/400/400'; }}
          />
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <p className="text-white/50 text-[10px] uppercase tracking-wider">{product.category}</p>
          <h3 className="text-white text-sm font-medium leading-snug line-clamp-2 flex-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {title}
          </h3>
          <StarRating rating={product.rating} count={product.reviewCount} />

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-[#D4AF37] font-bold text-base">{formatPrice(price)}</span>
            {compareAt && (
              <span className="text-white/30 text-xs line-through">{formatPrice(compareAt)}</span>
            )}
          </div>

          {/* Stock hint */}
          {product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 5) && (
            <p className="text-orange-400 text-[10px]">Only {product.stock} left</p>
          )}

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`mt-1 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all
              ${product.stock === 0
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : inCart
                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30'
                  : 'bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90'
              }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {inCart ? `In Cart (${qty})` : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  );
}
