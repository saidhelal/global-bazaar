import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Save, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth, apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';
import ImageUploader from '../../../components/ImageUploader';
import type { Product } from '../../../hooks/useProducts';

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports',
  'Books', 'Automotive', 'Art & Collectibles', 'Food & Gourmet',
  'Jewelry & Watches', 'Toys & Games', 'Health & Wellness', 'Other',
];

interface Props { initial?: Product; productId?: number; }

export default function ProductForm({ initial, productId }: Props) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [descriptionAr, setDescriptionAr] = useState(initial?.descriptionAr ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [price, setPrice] = useState(initial?.price ? String(parseFloat(initial.price)) : '');
  const [compareAtPrice, setCompareAtPrice] = useState(initial?.compareAtPrice ? String(parseFloat(initial.compareAtPrice)) : '');
  const [discountPercent, setDiscountPercent] = useState(String(initial?.discountPercent ?? 0));
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(initial?.lowStockThreshold ?? 5));
  const [weight, setWeight] = useState(initial?.weight ? String(parseFloat(initial.weight)) : '');
  const [currency] = useState('USD');
  const [status, setStatus] = useState<'draft' | 'pending_review'>(
    initial?.status === 'draft' ? 'draft' : 'pending_review'
  );
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [coverImage, setCoverImage] = useState<string | null>(initial?.coverImage ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEdit = !!productId;

  const tx = {
    en: {
      addTitle: 'Add New Product', editTitle: 'Edit Product',
      basicInfo: 'Basic Information', pricing: 'Pricing & Inventory', media: 'Images & Media',
      title: 'Product Title (English)', titleAr: 'Product Title (Arabic)',
      desc: 'Description (English)', descAr: 'Description (Arabic)',
      category: 'Category', subcategory: 'Subcategory', sku: 'SKU',
      price: 'Price (USD)', comparePrice: 'Compare-at Price', discount: 'Discount %',
      stock: 'Stock Quantity', lowStock: 'Low Stock Alert', weight: 'Weight (kg)',
      tags: 'Tags (comma separated)', status: 'Product Status',
      draft: 'Save as Draft', publish: 'Submit for Review',
      save: 'Save Changes', cancel: 'Cancel',
      submitHelp: 'Products require admin approval before going live.',
      saveDraft: 'Draft', submitReview: 'Submit for Review',
      rejectedBanner: 'This product was rejected:',
    },
    ar: {
      addTitle: 'إضافة منتج جديد', editTitle: 'تعديل المنتج',
      basicInfo: 'المعلومات الأساسية', pricing: 'التسعير والمخزون', media: 'الصور والوسائط',
      title: 'عنوان المنتج (إنجليزي)', titleAr: 'عنوان المنتج (عربي)',
      desc: 'الوصف (إنجليزي)', descAr: 'الوصف (عربي)',
      category: 'الفئة', subcategory: 'الفئة الفرعية', sku: 'رقم المنتج',
      price: 'السعر (USD)', comparePrice: 'سعر المقارنة', discount: 'نسبة الخصم %',
      stock: 'الكمية المتاحة', lowStock: 'تنبيه نفاد المخزون', weight: 'الوزن (كج)',
      tags: 'الوسوم (مفصولة بفاصلة)', status: 'حالة المنتج',
      draft: 'حفظ كمسودة', publish: 'إرسال للمراجعة',
      save: 'حفظ التغييرات', cancel: 'إلغاء',
      submitHelp: 'المنتجات تحتاج موافقة المسؤول قبل النشر.',
      saveDraft: 'مسودة', submitReview: 'إرسال للمراجعة',
      rejectedBanner: 'تم رفض هذا المنتج:',
    },
  }[lang];

  const inputCls = "w-full bg-[#0A1628] border border-white/10 focus:border-primary/60 text-white px-4 py-2.5 rounded-lg text-sm outline-none transition-colors placeholder-white/20";
  const labelCls = "block text-white/70 text-sm mb-1.5";
  const sectionCls = "bg-[#112240] rounded-lg border border-white/5 p-5 space-y-4";

  function handleImagesChange(imgs: string[], cover: string | null) {
    setImages(imgs);
    setCoverImage(cover);
  }

  async function handleSubmit(submitStatus: 'draft' | 'pending_review') {
    if (!title) { setError(lang === 'en' ? 'Title is required' : 'العنوان مطلوب'); return; }
    if (!category) { setError(lang === 'en' ? 'Category is required' : 'الفئة مطلوبة'); return; }
    if (!price || parseFloat(price) <= 0) { setError(lang === 'en' ? 'Valid price is required' : 'السعر مطلوب'); return; }

    setError(''); setSaving(true);
    try {
      const payload = {
        title, titleAr: titleAr || undefined,
        description: description || undefined, descriptionAr: descriptionAr || undefined,
        category, subcategory: subcategory || undefined,
        sku: sku || undefined,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        discountPercent: parseInt(discountPercent) || 0,
        currency, stock: parseInt(stock) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
        weight: weight ? parseFloat(weight) : undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images, coverImage,
        status: submitStatus,
      };

      if (isEdit) {
        await apiFetch(`/products/vendor/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setSuccess(lang === 'en' ? 'Product updated!' : 'تم تحديث المنتج!');
      } else {
        await apiFetch('/products/vendor/products', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess(lang === 'en' ? 'Product created!' : 'تم إنشاء المنتج!');
        setTimeout(() => setLocation('/dashboard/products'), 1200);
      }
    } catch (err: any) {
      setError(err.message || (lang === 'en' ? 'Failed to save product' : 'فشل حفظ المنتج'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl" dir={dir}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation('/dashboard/products')}
            className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{isEdit ? tx.editTitle : tx.addTitle}</h2>
            <p className="text-white/40 text-xs mt-0.5">{tx.submitHelp}</p>
          </div>
        </div>

        {/* Rejection banner */}
        {initial?.status === 'rejected' && initial.rejectionReason && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-semibold">{tx.rejectedBanner}</p>
              <p className="text-red-400/80 text-sm mt-0.5">{initial.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-5 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Basic info */}
          <div className={sectionCls}>
            <h3 className="text-white font-semibold text-sm border-b border-white/5 pb-3">{tx.basicInfo}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{tx.title} *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls}
                    placeholder="e.g. Premium Wireless Headphones" data-testid="input-title" />
                </div>
                <div>
                  <label className={labelCls}>{tx.titleAr}</label>
                  <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className={inputCls}
                    placeholder="مثال: سماعات لاسلكية مميزة" dir="rtl" data-testid="input-title-ar" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{tx.desc}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className={`${inputCls} resize-none`} placeholder="Describe your product..."
                  data-testid="input-description" />
              </div>
              <div>
                <label className={labelCls}>{tx.descAr}</label>
                <textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={3}
                  className={`${inputCls} resize-none`} placeholder="صف منتجك..." dir="rtl"
                  data-testid="input-description-ar" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>{tx.category} *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className={`${inputCls} appearance-none`} data-testid="select-category">
                    <option value="">—</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tx.subcategory}</label>
                  <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className={inputCls}
                    data-testid="input-subcategory" />
                </div>
                <div>
                  <label className={labelCls}>{tx.sku}</label>
                  <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls}
                    placeholder="SKU-001" dir="ltr" data-testid="input-sku" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{tx.tags}</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls}
                  placeholder="wireless, audio, premium" data-testid="input-tags" />
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className={sectionCls}>
            <h3 className="text-white font-semibold text-sm border-b border-white/5 pb-3">{tx.pricing}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>{tx.price} *</label>
                <div className="relative">
                  <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                    className={`${inputCls} pl-7 rtl:pl-4 rtl:pr-7`} placeholder="0.00"
                    dir="ltr" data-testid="input-price" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{tx.comparePrice}</label>
                <div className="relative">
                  <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)}
                    className={`${inputCls} pl-7 rtl:pl-4 rtl:pr-7`} placeholder="0.00"
                    dir="ltr" data-testid="input-compare-price" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{tx.discount}</label>
                <div className="relative">
                  <input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)}
                    className={`${inputCls} pr-7 rtl:pr-4 rtl:pl-7`} dir="ltr" data-testid="input-discount" />
                  <span className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>{tx.stock} *</label>
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                  className={inputCls} dir="ltr" data-testid="input-stock" />
              </div>
              <div>
                <label className={labelCls}>{tx.lowStock}</label>
                <input type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)}
                  className={inputCls} dir="ltr" data-testid="input-low-stock" />
              </div>
              <div>
                <label className={labelCls}>{tx.weight}</label>
                <input type="number" min="0" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className={inputCls} dir="ltr" data-testid="input-weight" />
              </div>
            </div>
            {/* Price preview */}
            {price && (
              <div className="bg-[#0A1628] rounded-lg px-4 py-3 flex items-center gap-4">
                <span className="text-primary font-bold text-xl">${parseFloat(price).toFixed(2)}</span>
                {compareAtPrice && <span className="text-white/40 line-through text-sm">${parseFloat(compareAtPrice).toFixed(2)}</span>}
                {parseInt(discountPercent) > 0 && (
                  <span className="bg-red-500/15 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">-{discountPercent}%</span>
                )}
              </div>
            )}
          </div>

          {/* Images */}
          <div className={sectionCls}>
            <h3 className="text-white font-semibold text-sm border-b border-white/5 pb-3">{tx.media}</h3>
            <ImageUploader images={images} coverImage={coverImage} onChange={handleImagesChange} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" disabled={saving} onClick={() => handleSubmit('draft')}
              className="flex items-center gap-2 border border-white/20 text-white/70 hover:text-white hover:border-white/40 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              data-testid="button-save-draft">
              <Save className="w-4 h-4" />
              {tx.saveDraft}
            </button>
            <button type="button" disabled={saving} onClick={() => handleSubmit('pending_review')}
              className="flex items-center gap-2 bg-primary text-[#0A1628] font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-submit-review">
              {saving
                ? <div className="w-4 h-4 border-2 border-[#0A1628] border-t-transparent rounded-full animate-spin" />
                : <Eye className="w-4 h-4" />}
              {isEdit ? tx.save : tx.submitReview}
            </button>
            <button type="button" onClick={() => setLocation('/dashboard/products')}
              className="text-white/40 hover:text-white/70 text-sm transition-colors"
              data-testid="button-cancel">
              {tx.cancel}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
