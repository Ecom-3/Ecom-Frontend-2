export const parseVariantAttributes = (attributes) => {
  if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) return attributes;
  if (typeof attributes !== 'string') return {};
  try {
    const parsed = JSON.parse(attributes);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const normalizeWeightLabel = (value) => {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\s*(?:weight\s*:\s*)?)(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|grams?)\s*$/i);
  if (!match) return text;
  const amount = Number(match[2]);
  const grams = /^k/i.test(match[3]) ? amount * 1000 : amount;
  if (!Number.isFinite(grams) || grams <= 0) return text;
  const formatted = grams < 1000
    ? `${Number(grams.toFixed(3))} g`
    : `${Number((grams / 1000).toFixed(3))} kg`;
  return `${match[1]}${formatted}`;
};

export const variantChoiceLabel = (variant) => {
  const attributes = parseVariantAttributes(variant?.attributes);
  const values = Object.entries(attributes)
    .filter(([key, value]) => /^(size|weight|color|colour|pack|type|flavou?r|capacity|material)$/i.test(key) && value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${key[0].toUpperCase()}${key.slice(1)}: ${key.toLowerCase() === 'weight' ? normalizeWeightLabel(value) : String(value).trim()}`);
  if (values.length) return values.join(' · ');
  const name = String(variant?.name || variant?.label || variant?.size || variant?.weight || '').trim();
  return /^(default|variant|option)$/i.test(name) ? '' : normalizeWeightLabel(name);
};

export const normalizeProductImageUrl = (value) => {
  const url = String(value || '').trim();
  if (!url || /^(?:https?:)?\/\/(?:www\.)?(?:loremflickr\.com|source\.unsplash\.com)(?:\/|$)/i.test(url)) return '';
  if (/^(?:https?:\/\/|data:image\/)/i.test(url)) return url;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return '';
  return url;
};
