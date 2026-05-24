import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../contexts/AuthContext';

export interface Product {
  id: number;
  vendorId: number;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  category: string;
  subcategory?: string | null;
  sku?: string | null;
  price: string;
  compareAtPrice?: string | null;
  discountPercent?: number | null;
  currency: string;
  stock: number;
  lowStockThreshold?: number | null;
  weight?: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  rejectionReason?: string | null;
  isFeatured?: boolean | null;
  tags?: string[] | null;
  images?: string[] | null;
  coverImage?: string | null;
  adminNotes?: string | null;
  viewCount?: number | null;
  salesCount?: number | null;
  rating?: string | null;
  reviewCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useVendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    apiFetch('/products/vendor/mine')
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const deleteProduct = useCallback(async (id: number) => {
    await apiFetch(`/products/vendor/products/${id}`, { method: 'DELETE' });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { products, loading, error, refresh, deleteProduct };
}

export function useAdminProducts(statusFilter?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    apiFetch(`/products/admin/all${qs}`)
      .then((d) => setProducts(d.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const approve = useCallback(async (id: number, adminNotes?: string) => {
    const data = await apiFetch(`/products/admin/products/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ adminNotes }),
    });
    setProducts((prev) => prev.map((p) => p.id === id ? data.product : p));
  }, []);

  const reject = useCallback(async (id: number, reason: string) => {
    const data = await apiFetch(`/products/admin/products/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    setProducts((prev) => prev.map((p) => p.id === id ? data.product : p));
  }, []);

  const feature = useCallback(async (id: number, featured: boolean) => {
    const data = await apiFetch(`/products/admin/products/${id}/feature`, {
      method: 'PUT',
      body: JSON.stringify({ featured }),
    });
    setProducts((prev) => prev.map((p) => p.id === id ? data.product : p));
  }, []);

  return { products, loading, refresh, approve, reject, feature };
}
