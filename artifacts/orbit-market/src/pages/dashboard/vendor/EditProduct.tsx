import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';
import ProductForm from './ProductForm';
import type { Product } from '../../../hooks/useProducts';

export default function EditProduct() {
  const params = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;
    apiFetch(`/products/vendor/mine`)
      .then((d) => {
        const found = d.products.find((p: Product) => p.id === parseInt(params.id!));
        if (found) setProduct(found);
        else setError(lang === 'en' ? 'Product not found' : 'المنتج غير موجود');
      })
      .catch(() => setError(lang === 'en' ? 'Failed to load product' : 'فشل تحميل المنتج'))
      .finally(() => setLoading(false));
  }, [params.id, lang]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-red-400">{error || (lang === 'en' ? 'Product not found' : 'المنتج غير موجود')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return <ProductForm initial={product} productId={product.id} />;
}
