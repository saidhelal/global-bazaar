export interface Subcategory {
  value: string;
  en: string;
  ar: string;
}

export interface Category {
  value: string;
  en: string;
  ar: string;
  emoji: string;
  bannerImage: string;
  cardImages: string[];
  subcategories: Subcategory[];
}

export const CATEGORIES: Category[] = [
  {
    value: 'Fashion',
    en: 'Fashion',
    ar: 'أزياء',
    emoji: '👗',
    bannerImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Men Clothing', en: 'Men Clothing', ar: 'ملابس رجالية' },
      { value: 'Women Clothing', en: 'Women Clothing', ar: 'ملابس نسائية' },
      { value: 'Kids Clothing', en: 'Kids Clothing', ar: 'ملابس أطفال' },
      { value: 'Shoes', en: 'Shoes', ar: 'أحذية' },
      { value: 'Bags', en: 'Bags', ar: 'حقائب' },
      { value: 'Accessories', en: 'Accessories', ar: 'إكسسوارات' },
      { value: 'Watches', en: 'Watches', ar: 'ساعات' },
      { value: 'Glasses', en: 'Glasses', ar: 'نظارات' },
    ],
  },
  {
    value: 'Beauty & Personal Care',
    en: 'Beauty & Personal Care',
    ar: 'الجمال والعناية',
    emoji: '💄',
    bannerImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1614622614-4db6e52f6065?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Perfumes', en: 'Perfumes', ar: 'عطور' },
      { value: 'Cosmetics', en: 'Cosmetics', ar: 'مستحضرات تجميل' },
      { value: 'Skincare', en: 'Skincare', ar: 'العناية بالبشرة' },
      { value: 'Haircare', en: 'Haircare', ar: 'العناية بالشعر' },
    ],
  },
  {
    value: 'Electronics',
    en: 'Electronics',
    ar: 'إلكترونيات',
    emoji: '📱',
    bannerImage: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Mobiles & Accessories', en: 'Mobiles & Accessories', ar: 'الجوالات والإكسسوارات' },
      { value: 'Computers & Laptops', en: 'Computers & Laptops', ar: 'أجهزة الكمبيوتر والمحمول' },
      { value: 'Headphones & Accessories', en: 'Headphones & Accessories', ar: 'سماعات وإكسسوارات' },
    ],
  },
  {
    value: 'Home & Kitchen',
    en: 'Home & Kitchen',
    ar: 'المنزل والمطبخ',
    emoji: '🏠',
    bannerImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Home Appliances', en: 'Home Appliances', ar: 'الأجهزة المنزلية' },
      { value: 'Home Tools', en: 'Home Tools', ar: 'أدوات منزلية' },
      { value: 'Kitchen & Cooking Tools', en: 'Kitchen & Cooking Tools', ar: 'أدوات المطبخ والطهي' },
      { value: 'Furnishings', en: 'Furnishings', ar: 'أثاث' },
      { value: 'Decor', en: 'Decor', ar: 'ديكور' },
    ],
  },
  {
    value: 'Kids & Baby',
    en: 'Kids & Baby',
    ar: 'الأطفال والرضع',
    emoji: '🍼',
    bannerImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Baby Supplies', en: 'Baby Supplies', ar: 'مستلزمات الأطفال' },
    ],
  },
  {
    value: 'Sports & Fitness',
    en: 'Sports & Fitness',
    ar: 'الرياضة واللياقة',
    emoji: '⚽',
    bannerImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1584735175315-9d5df23be620?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Sports', en: 'Sports', ar: 'الرياضة' },
    ],
  },
  {
    value: 'Toys & Games & Hobbies',
    en: 'Toys, Games & Hobbies',
    ar: 'ألعاب وهوايات',
    emoji: '🎮',
    bannerImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Games & Hobbies', en: 'Games & Hobbies', ar: 'الألعاب والهوايات' },
    ],
  },
  {
    value: 'Books',
    en: 'Books',
    ar: 'كتب',
    emoji: '📚',
    bannerImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Books', en: 'Books', ar: 'كتب' },
    ],
  },
  {
    value: 'Automotive',
    en: 'Automotive',
    ar: 'السيارات',
    emoji: '🚗',
    bannerImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1600705353592-257a0772718e?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1616788494672-ec7ca25fdda9?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Cars & Accessories', en: 'Cars & Accessories', ar: 'سيارات وإكسسوارات' },
    ],
  },
  {
    value: 'Supermarket',
    en: 'Supermarket',
    ar: 'سوبرماركت',
    emoji: '🛒',
    bannerImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
    cardImages: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1467453678174-768ec283a940?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=200&auto=format&fit=crop',
    ],
    subcategories: [
      { value: 'Supermarket', en: 'Supermarket', ar: 'سوبرماركت' },
    ],
  },
];

export const FLAT_SUBCATEGORIES = CATEGORIES.flatMap(c =>
  c.subcategories.map(s => ({ ...s, parent: c.value, parentEn: c.en, parentAr: c.ar }))
);

export function getCategoryByValue(value: string): Category | undefined {
  return CATEGORIES.find(c => c.value === value);
}

export function getSubcategoryParent(subValue: string): Category | undefined {
  return CATEGORIES.find(c => c.subcategories.some(s => s.value === subValue));
}
