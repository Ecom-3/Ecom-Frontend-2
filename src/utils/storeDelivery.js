import { parseDeliveryEstimate } from './productBrowsing.js';

export const DELIVERY_MODE_OPTIONS = ['Standard Delivery', 'Instant Delivery', 'Express Delivery', 'Scheduled Delivery', 'Store Pickup'];
export const DELIVERY_METHOD_PRIORITY = ['instant', 'scheduled', 'express', 'standard', 'pickup'];

export const parseDeliveryModes = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
};

export const deliveryMethodId = (value = '') => {
  const normalized = String(value).trim().toLowerCase();
  if (normalized.includes('pickup')) return 'pickup';
  if (normalized.includes('scheduled')) return 'scheduled';
  if (normalized.includes('express')) return 'express';
  if (normalized.includes('instant')) return 'instant';
  if (normalized.includes('same-day') || normalized.includes('same day')) return 'instant';
  return 'standard';
};

export const sortDeliveryMethods = (methods = []) => [...methods].sort((a, b) => {
  const aRank = DELIVERY_METHOD_PRIORITY.indexOf(deliveryMethodId(a.deliveryType || a.label || a.id));
  const bRank = DELIVERY_METHOD_PRIORITY.indexOf(deliveryMethodId(b.deliveryType || b.label || b.id));
  return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
});

export const preferredDeliveryMethod = (quote = {}) => {
  const methods = sortDeliveryMethods((quote.methods || []).filter((method) => method.enabled !== false));
  if (!quote.deliveryAvailable || !methods.length) return '';
  const instant = methods.find((method) => deliveryMethodId(method.deliveryType) === 'instant');
  if (instant) return instant.deliveryType;
  const standard = methods.find((method) => deliveryMethodId(method.deliveryType) === 'standard');
  if (standard) return standard.deliveryType;
  const scheduled = methods.find((method) => deliveryMethodId(method.deliveryType) === 'scheduled');
  if (scheduled) return scheduled.deliveryType;
  return methods[0].deliveryType;
};

export const deliverySlotLabel = (method = '') => {
  const id = deliveryMethodId(method);
  if (id === 'instant') return 'Instant delivery available';
  if (id === 'express') return 'Express delivery available';
  if (id === 'scheduled') return 'Scheduled delivery available';
  if (id === 'pickup') return 'Store pickup available';
  return 'Standard delivery available';
};

export const deliverySummary = (store = {}, formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`) => {
  const radius = Number(store.deliveryRadiusKm || 0);
  const eta = parseDeliveryEstimate(store.deliveryEtaMinutes);
  const charge = Number(store.deliveryCharge || 0);
  const freeAbove = Number(store.freeDeliveryAbove || 0);
  const modes = parseDeliveryModes(store.deliveryModes);
  const radiusText = Number.isInteger(radius) ? String(radius) : radius.toFixed(1);
  return {
    radiusLabel: radius > 0 ? `${radiusText} km radius` : 'Radius not set',
    etaLabel: eta ? `${eta.min === eta.max ? eta.max : `${eta.min}–${eta.max}`} min delivery` : 'Delivery ETA not set',
    chargeLabel: charge > 0 ? `${formatCurrency(charge)} delivery charge` : 'No delivery charge',
    freeLabel: freeAbove > 0 ? `Free above ${formatCurrency(freeAbove)}` : 'No free delivery threshold',
    modesLabel: modes.length ? modes.join(', ') : 'Delivery modes not set',
    modes,
  };
};

const coordinate = (value, limit) => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
const locationCoordinate = (location, axis) => {
  const direct = axis === 'latitude' ? location?.latitude : location?.longitude;
  const nested = axis === 'latitude' ? location?.coordinates?.lat : location?.coordinates?.lng;
  const alias = axis === 'latitude' ? location?.lat : location?.lng;
  return coordinate(direct, axis === 'latitude' ? 90 : 180) ? Number(direct)
    : coordinate(nested, axis === 'latitude' ? 90 : 180) ? Number(nested)
      : coordinate(alias, axis === 'latitude' ? 90 : 180) ? Number(alias) : null;
};
const activeStore = (store = {}) => store.active !== false && store.deliveryEnabled !== false && !['inactive', 'closed'].includes(String(store.status).toLowerCase()) &&
  String(store.availability).toLowerCase() !== 'unavailable' &&
  ![false, 'no', 'false'].includes(typeof store.delivery === 'string' ? store.delivery.toLowerCase() : store.delivery);

export const isGlobalStore = (store = {}) => {
  if (!store || typeof store !== 'object') return false;
  const text = [store.id, store.name, store.type, store.scope, store.fulfillmentType, store.channel, store.deliveryMethod, store.deliveryLabel]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return activeStore(store) && (store.global === true || store.globalStore === true || store.isGlobal === true || text.includes('global') || text.includes('india-wide') || text.includes('india wide'));
};

export const isGlobalProduct = (product = {}) => {
  return product.globalProduct === true;
};

export const GLOBAL_STORE_LISTING = Object.freeze({
  id: 'global-store', name: 'India-wide Global Store', global: true, status: 'Active', active: true,
  delivery: 'Yes', pickup: 'No', deliveryEnabled: true, deliveryModes: 'Global Delivery',
  deliveryLabel: 'India-wide delivery', location: 'India', city: 'India', address: 'Nationwide delivery for global products',
});

export const withGlobalStoreFallback = (stores = []) => {
  const rows = Array.isArray(stores) ? stores.filter((store) => store && typeof store === 'object') : [];
  return rows.some(isGlobalStore) ? rows : [...rows, GLOBAL_STORE_LISTING];
};

export const isProductEligibleForStore = (product = {}, store = {}) =>
  !isGlobalStore(store) || isGlobalProduct(product);

export const deliveryDistanceKm = (store, location) => {
  const storeLatitude = locationCoordinate(store, 'latitude');
  const storeLongitude = locationCoordinate(store, 'longitude');
  const userLatitude = locationCoordinate(location, 'latitude');
  const userLongitude = locationCoordinate(location, 'longitude');
  if (storeLatitude === null || storeLongitude === null || userLatitude === null || userLongitude === null) return Infinity;
  const rad = (value) => Number(value) * Math.PI / 180;
  const dLat = rad(userLatitude) - rad(storeLatitude);
  const dLon = rad(userLongitude) - rad(storeLongitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(storeLatitude)) * Math.cos(rad(userLatitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
};

export const storeDeliversTo = (store, location) => Boolean(store && location &&
  activeStore(store) &&
  Number(store.deliveryRadiusKm) > 0 && deliveryDistanceKm(store, location) <= Number(store.deliveryRadiusKm));

export const deliveryProducts = (products, mappings, stores, location) => {
  const eligible = new Map(stores.filter((store) => storeDeliversTo(store, location) || isGlobalStore(store)).map((store) => [String(store.id), store]));
  const masters = new Map(products.map((product) => [String(product.productId ?? product.id), product]));
  const rows = mappings.length ? mappings.filter((item) => item.product && String(item.status).toLowerCase() !== 'inactive')
    .map((item) => ({ ...(masters.get(String(item.productId)) || item.product), available:item.available !== false, storeId: item.storeId })) : products;
  const nearbyRows = rows.filter((item) => item.active !== false && String(item.status).toLowerCase() !== 'inactive' && eligible.has(String(item.storeId)) && isProductEligibleForStore(item, eligible.get(String(item.storeId))))
    .map((item) => {
      const store = eligible.get(String(item.storeId));
      return { ...item, store: store.name, storeName: store.name, fulfillmentType: isGlobalStore(store) ? 'global' : 'nearby' };
    });
  const nearbyKeys = new Set(nearbyRows.filter((item) => item.fulfillmentType === 'global').map((item) => String(item.productId ?? item.id)));
  const globalRows = products
    .filter((item) => item.active !== false && String(item.status).toLowerCase() !== 'inactive' && item.available !== false && isGlobalProduct(item) && !nearbyKeys.has(String(item.productId ?? item.id)))
    .map((item) => ({ ...item, storeId: 'global-store', store: 'India-wide Global Store', storeName: 'India-wide Global Store', fulfillmentType: 'global', deliveryLabel: item.deliveryLabel || '7-10 days delivery' }));
  return [...nearbyRows, ...globalRows];
};
