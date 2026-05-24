import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch } from '../../contexts/AuthContext';
import { CATEGORIES, getSubcategoryParent } from '../../data/categories';
import type { Product } from '../../hooks/useProducts';

const SORT_OPTIONS = [
  { value: 'newest',    label: { en: 'Newest First',        ar: 'الأحدث أولاً' } },
  { value: 'price_asc', label: { en: 'Price: Low to High', ar: 'السعر: من الأقل' } },
  { value: 'price_desc',label: { en: 'Price: High to Low', ar: 'السعر: من الأعلى' } },
  { value: 'rating',    label: { en: 'Top Rated',          ar: 'الأعلى تقييماً' } },
];

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    search: p.get('search') || '',
    category: p.get('category') || '',
    sort: p.get('sort') || 'newest',
    minPrice: p.get('minPrice') || '',
    maxPrice: p.get('maxPrice') || '',
    page: parseInt(p.get('page') || '1'),
  };
}

export default function ProductCatalog() {
  const { lang, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState(getParams);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const pageSize = 24;
  const totalPages = Math.ceil(total / pageSize);

  const fetchProducts = useCallback(async (f: typeof filters) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (f.category) qs.set('category', f.category);
      if (f.search) qs.set('search', f.search);
      if (f.sort) qs.set('sort', f.sort);
      if (f.minPrice) qs.set('minPrice', f.minPrice);
      if (f.maxPrice) qs.set('maxPrice', f.maxPrice);
      qs.set('page', String(f.page));
      qs.set('limit', String(pageSize));
      const data = await apiFetch(`/products?${qs.toString()}`);
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(filters);
    const qs = new URLSearchParams();
    if (filters.search) qs.set('search', filters.search);
    if (filters.category) qs.set('category', filters.category);
    if (filters.sort !== 'newest') qs.set('sort', filters.sort);
    if (filters.minPrice) qs.set('minPrice', filters.minPrice);
    if (filters.maxPrice) qs.set('maxPrice', filters.maxPrice);
    if (filters.page > 1) qs.set('page', String(filters.page));
    const qs2 = qs.toString();
    setLocation(`/products${qs2 ? `?${qs2}` : ''}`, { replace: true });
  }, [filters, fetchProducts, setLocation]);

  // Auto-expand the parent category if a subcategory is selected
  useEffect(() => {
    if (filters.category) {
      const parent = getSubcategoryParent(filters.category);
      if (parent) setExpandedCats(prev => new Set([...prev, parent.value]));
      // Also expand if it's a main category
      const mainCat = CATEGORIES.find(c => c.value === filters.category);
      if (mainCat) setExpandedCats(prev => new Set([...prev, mainCat.value]));
    }
  }, [filters.category]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters(f => ({ ...f, search: searchInput, page: 1 }));
  }

  function setCategory(cat: string) {
    setFilters(f => ({ ...f, category: cat, page: 1 }));
    setShowFilters(false);
  }

  function clearFilters() {
    setSearchInput('');
    setFilters({ search: '', category: '', sort: 'newest', minPrice: '', maxPrice: '', page: 1 });
  }

  function toggleExpand(catValue: string) {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catValue)) next.delete(catValue);
      else next.add(catValue);
      return next;
    });
  }

  const hasActiveFilters = !!filters.category || !!filters.search || !!filters.minPrice || !!filters.maxPrice;

  // Breadcrumb: figure out if the selected category is a subcategory
  const selectedMainCat = CATEGORIES.find(c => c.value === filters.category);
  const selectedSubParent = getSubcategoryParent(filters.category);
  const selectedSubcat = selectedSubParent?.subcategories.find(s => s.value === filters.category);

  function getPageTitle() {
    if (!filters.category) return lang === 'ar' ? 'جميع المنتجات' : 'All Products';
    if (selectedMainCat) return lang === 'ar' ? selectedMainCat.ar : selectedMainCat.en;
    if (selectedSubcat) return lang === 'ar' ? selectedSubcat.ar : selectedSubcat.en;
    return filters.category;
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-5">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-4 flex-wrap">
          <button onClick={() => setLocation('/')} className="hover:text-white transition-colors">
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <span>/</span>
          {selectedSubParent && (
            <>
              <button onClick={() => setCategory(selectedSubParent.value)} className="hover:text-white transition-colors">
                {lang === 'ar' ? selectedSubParent.ar : selectedSubParent.en}
              </button>
              <span>/</span>
            </>
          )}
          <span className="text-white/70">{getPageTitle()}</span>
        </nav>

        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-5">
          <div>
            <h1 className="text-white font-bold text-2xl">{getPageTitle()}</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {loading ? '...' : `${total.toLocaleString()} ${lang === 'ar' ? 'منتج' : 'products'}`}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <form onSubmit={applySearch} className="flex flex-1 sm:w-72 rounded-lg overflow-hidden border border-white/10 focus-within:border-primary/40">
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث عن منتجات...' : 'Search products...'}
                className="flex-1 bg-[#112240] text-white placeholder-white/30 px-3 py-2 text-sm outline-none" />
              <button type="submit" className="bg-primary px-3 text-[#0A1628]"><Search className="w-4 h-4" /></button>
            </form>
            <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value, page: 1 }))}
              className="bg-[#112240] border border-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none">
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label[lang]}</option>
              ))}
            </select>
            <button onClick={() => setShowFilters(!showFilters)} className="md:hidden p-2 bg-[#112240] border border-white/10 rounded-lg text-white">
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.category && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm">
                {getPageTitle()}
                <button onClick={() => setFilters(f => ({ ...f, category: '', page: 1 }))}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.search && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm">
                "{filters.search}"
                <button onClick={() => { setSearchInput(''); setFilters(f => ({ ...f, search: '', page: 1 })); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm">
                ${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}
                <button onClick={() => setFilters(f => ({ ...f, minPrice: '', maxPrice: '', page: 1 }))}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={clearFilters} className="text-white/40 text-sm hover:text-white/70 px-2">
              {lang === 'ar' ? 'مسح الكل' : 'Clear all'}
            </button>
          </div>
        )}

        <div className="flex gap-5">
          {/* Sidebar */}
          <aside className={`w-56 flex-shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="bg-[#112240] border border-white/5 rounded-xl p-4 sticky top-24 space-y-5">

              {/* Category tree */}
              <div>
                <h3 className="text-white font-bold text-sm mb-2">{lang === 'ar' ? 'الأقسام' : 'Departments'}</h3>

                {/* "All" button */}
                <button
                  onClick={() => setCategory('')}
                  className={`w-full text-left rtl:text-right px-3 py-1.5 rounded-lg text-sm transition-colors mb-1 ${!filters.category ? 'bg-primary text-[#0A1628] font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                  {lang === 'ar' ? 'الكل' : 'All'}
                </button>

                <div className="space-y-0.5">
                  {CATEGORIES.map(cat => {
                    const isMainActive = filters.category === cat.value;
                    const isChildActive = cat.subcategories.some(s => s.value === filters.category);
                    const isExpanded = expandedCats.has(cat.value);

                    return (
                      <div key={cat.value}>
                        <div className="flex items-center">
                          <button
                            onClick={() => setCategory(cat.value)}
                            className={`flex-1 text-left rtl:text-right px-3 py-1.5 rounded-l-lg rtl:rounded-r-lg rtl:rounded-l-none text-sm transition-colors ${isMainActive || isChildActive ? 'text-primary font-semibold' : 'text-white/60 hover:text-white'}`}>
                            <span className="mr-1.5 rtl:ml-1.5 rtl:mr-0">{cat.emoji}</span>
                            {lang === 'ar' ? cat.ar : cat.en}
                          </button>
                          {cat.subcategories.length > 0 && (
                            <button
                              onClick={() => toggleExpand(cat.value)}
                              className="px-2 py-1.5 text-white/30 hover:text-white transition-colors">
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="ml-4 rtl:ml-0 rtl:mr-4 mt-0.5 space-y-0.5 border-l rtl:border-l-0 rtl:border-r border-white/5 pl-2 rtl:pl-0 rtl:pr-2">
                            {cat.subcategories.map(sub => (
                              <button
                                key={sub.value}
                                onClick={() => setCategory(sub.value)}
                                className={`w-full text-left rtl:text-right px-2 py-1 rounded-lg text-xs transition-colors ${filters.category === sub.value ? 'bg-primary text-[#0A1628] font-bold' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
                                {lang === 'ar' ? sub.ar : sub.en}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price range */}
              <div>
                <h3 className="text-white font-bold text-sm mb-2">{lang === 'ar' ? 'نطاق السعر' : 'Price Range'}</h3>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder={lang === 'ar' ? 'أقل' : 'Min'} min={0}
                    value={filters.minPrice}
                    onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 text-white text-xs px-2 py-1.5 rounded outline-none" />
                  <span className="text-white/30 text-xs">–</span>
                  <input type="number" placeholder={lang === 'ar' ? 'أكثر' : 'Max'} min={0}
                    value={filters.maxPrice}
                    onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                    className="w-full bg-[#0A1628] border border-white/10 text-white text-xs px-2 py-1.5 rounded outline-none" />
                </div>
                <button
                  onClick={() => setFilters(f => ({ ...f, page: 1 }))}
                  className="mt-2 w-full text-sm py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors">
                  {lang === 'ar' ? 'تطبيق' : 'Apply'}
                </button>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-[#112240] border border-white/5 rounded-xl aspect-[3/4] animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">
                  {lang === 'ar' ? 'لا توجد منتجات' : 'No products found'}
                </h3>
                <p className="text-white/40 text-sm mb-6">
                  {lang === 'ar' ? 'جرب تغيير الفلاتر أو عبارات البحث' : 'Try adjusting your filters or search terms'}
                </p>
                <button onClick={clearFilters} className="px-6 py-2 bg-primary text-[#0A1628] font-semibold rounded-lg">
                  {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                      disabled={filters.page <= 1}
                      className="p-2 rounded-lg border border-white/10 text-white disabled:opacity-30 hover:bg-white/5 transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      const pg = i + 1;
                      return (
                        <button key={pg} onClick={() => setFilters(f => ({ ...f, page: pg }))}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${filters.page === pg ? 'bg-primary text-[#0A1628]' : 'border border-white/10 text-white hover:bg-white/5'}`}>
                          {pg}
                        </button>
                      );
                    })}
                    <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                      disabled={filters.page >= totalPages}
                      className="p-2 rounded-lg border border-white/10 text-white disabled:opacity-30 hover:bg-white/5 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
