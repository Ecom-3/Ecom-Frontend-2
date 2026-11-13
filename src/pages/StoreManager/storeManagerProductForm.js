import { isValidImageUrl, normalizeImageUrl } from '../../utils/imageUrl.js';

export const slugifyProductName = (value = '') => String(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 200);

export const validateStoreManagerProductForm = (form = {}) => {
  const errors = {};
  if (!String(form.name || '').trim()) errors.name = 'Product name is required.';
  if (!String(form.sku || '').trim()) errors.sku = 'SKU is required.';
  if (!String(form.categoryId || '').trim()) errors.categoryId = 'Choose a category.';
  if (!slugifyProductName(form.slug || form.name)) errors.slug = 'Enter a valid product name for the URL slug.';
  const variants = (form.variants || []).filter((variant) => [variant.sku, variant.name, variant.price].some((value) => String(value ?? '').trim()));
  if (form.status !== 'DRAFT' && !variants.some((variant) => variant.active !== false && String(variant.sku || '').trim() && String(variant.name || '').trim() && Number.isFinite(Number(variant.price)) && Number(variant.price) >= 0)) {
    errors.variants = 'An active product needs at least one active variant with a SKU, name, and valid price.';
  }
  variants.forEach((variant, index) => {
    if (!String(variant.sku || '').trim() || !String(variant.name || '').trim() || !Number.isFinite(Number(variant.price)) || Number(variant.price) < 0) {
      errors.variants = `Variant ${index + 1} needs a SKU, name, and non-negative price.`;
    } else if (variant.compareAtPrice !== '' && variant.compareAtPrice != null && Number(variant.compareAtPrice) < Number(variant.price)) {
      errors.variants = `Variant ${index + 1} compare-at price must be at least its price.`;
    }
  });
  (form.images || []).forEach((image, index) => {
    if (String(image.url || '').trim() && !isValidImageUrl(image.url)) errors.images = `Image ${index + 1} must be a Google Drive image link shared with anyone who has the link.`;
  });
  return errors;
};

export const toStoreManagerVariantPayload = (variant = {}) => ({
  sku: String(variant.sku || '').trim(),
  name: String(variant.name || '').trim(),
  attributes: String(variant.attributes || '').trim(),
  price: Number(variant.price),
  compareAtPrice: variant.compareAtPrice === '' || variant.compareAtPrice == null ? null : Number(variant.compareAtPrice),
  active: variant.active !== false,
});

export const toStoreManagerImagePayload = (image = {}, index = 0) => ({
  url: normalizeImageUrl(image.url),
  altText: String(image.altText || '').trim(),
  displayOrder: index,
  primaryImage: index === 0,
});

export const toStoreManagerProductPayload = (form = {}) => ({
  product: {
    categoryId: form.categoryId,
    subcategory: String(form.subcategory || 'Other').trim() || 'Other',
    name: String(form.name || '').trim(),
    slug: slugifyProductName(form.slug || form.name),
    sku: String(form.sku || '').trim(),
    description: String(form.description || '').trim(),
    brand: String(form.brand || '').trim(),
    ingredients: String(form.ingredients || '').trim(),
    specifications: String(form.specifications || '').trim(),
    pack: String(form.pack || '').trim(),
    type: String(form.type || '').trim(),
    shelfLife: String(form.shelfLife || '').trim(),
    tags: String(form.tags || '').trim(),
    highlights: String(form.highlights || '').trim(),
    aboutSource: String(form.aboutSource || '').trim(),
    status: form.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE',
    globalProduct: false,
    featured: false,
    special: false,
    newArrival: false,
    bestSeller: false,
  },
  available: form.available !== false,
});
