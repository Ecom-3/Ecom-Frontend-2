export { totalDeliveryCharge } from '../utils/deliveryCharges.js';
import { getCachedStoreDeliveryQuote, getStoreDeliveryQuote, getStores } from './catalogApi';
import { resolveProductStore } from './productStoreResolver';
import { pickupDeliveryLine, storeFulfillmentMethod } from '../utils/storeFulfillment.js';
import { deliveryMethodId, deliverySlotLabel, isGlobalProduct, isGlobalStore, preferredDeliveryMethod, sortDeliveryMethods, withGlobalStoreFallback } from '../utils/storeDelivery';

const lineKey = (item = {}) => `${item.storeId || item.sourceStoreId || item.store || item.storeName || 'store'}:${item.productId || item.id || ''}:${item.variantId ?? 'product'}`;

const itemTotal = (item = {}) => Number(item.price || item.unitPrice || 0) * Number(item.quantity || 0);

const matchesProduct = (left = {}, right = {}) => {
  const leftId = String(left.productId ?? left.id ?? '');
  const rightId = String(right.productId ?? right.id ?? '');
  return Boolean((leftId && rightId && leftId === rightId) || (left.title && right.title && left.title === right.title) || (left.productName && right.title && left.productName === right.title));
};

const isGlobalCartOffer = (item, source, product, store) => {
  // A resolved local store assignment takes precedence over stale fulfillment
  // flags. Global offers can also be identified by their explicit stock scope
  // when the Cart API omits catalog-only fields such as globalProduct.
  if (store && !isGlobalStore(store)) return false;
  return source?.storeId === 'global-store'
    || item?.storeId === 'global-store'
    || item?.sourceStoreId === 'global-store'
    || isGlobalStore(store)
    || isGlobalProduct(item)
    || isGlobalProduct(product);
};

const globalLine = (item, source = {}, quote = null) => ({
  key: lineKey(item),
  productId: item.productId || item.id || '',
  variantId: item.variantId ?? null,
  title: item.title || item.productName || item.name || 'Product',
  quantity: Number(item.quantity || 0),
  itemTotal: itemTotal(item),
  storeId: source.storeId || item.storeId || 'global-store',
  storeName: source.storeId === 'global-store' || item.storeId === 'global-store' || item.sourceStoreId === 'global-store'
    ? 'India-wide Global Store'
    : source.store || source.storeName || item.store || item.storeName || 'India-wide Global Store',
  sourceLocation: source.location || '',
  deliveryType: 'global',
  deliveryLabel: 'Global Delivery',
  estimatedDelivery: '7-10 days delivery',
  deliveryCharge: 0,
  fulfillmentType: 'global',
  globalApproval: 'Pending',
  quote,
});

const localLine = (item, source, quote, method) => {
  const selected = sortDeliveryMethods(quote?.methods || []).find((entry) => entry.enabled !== false && deliveryMethodId(entry.deliveryType) === deliveryMethodId(method)) || {};
  const charge = Number(selected.deliveryCharge ?? quote?.deliveryCharge ?? 0);
  const eta = selected.estimatedTime || (quote?.estimatedDeliveryMin && quote?.estimatedDeliveryMax ? `${quote.estimatedDeliveryMin}-${quote.estimatedDeliveryMax} min` : '');
  return {
    key: lineKey(item),
    productId: item.productId || item.id || '',
    variantId: item.variantId ?? null,
    title: item.title || item.productName || item.name || 'Product',
    quantity: Number(item.quantity || 0),
    itemTotal: itemTotal(item),
    storeId: source.storeId || quote?.storeId || '',
    storeName: source.store || source.storeName || '',
    sourceLocation: source.location || '',
    deliveryType: deliveryMethodId(method),
    deliveryLabel: deliverySlotLabel(method),
    estimatedDelivery: quote?.deliveryAvailable === false ? 'Delivery unavailable' : eta || 'Estimate unavailable',
    deliveryCharge: charge,
    fulfillmentType: 'nearby',
    globalApproval: 'Not Required',
    quote,
  };
};

export const buildCartDeliveryLines = async ({ cartItems = [], catalogProducts = [], latitude, longitude, defaultMethod = 'standard', cached = true, selectedStoreId = '', storeMethods = {} }) => {
  const response = await getStores();
  // Catalog APIs can include null placeholders when one store was removed or
  // partially migrated. Ignore those rows before any store.id lookup so a
  // malformed directory entry cannot break the entire cart summary.
  const storeRows = (Array.isArray(response) ? response : response?.content || response?.items || [])
    .filter((store) => store && typeof store === 'object');
  const products = (Array.isArray(catalogProducts) ? catalogProducts : [])
    .filter((product) => product && typeof product === 'object');
  const items = (Array.isArray(cartItems) ? cartItems : [])
    .filter((item) => item && typeof item === 'object');
  const stores = withGlobalStoreFallback(storeRows);
  if (!storeRows.length && items.some((item) => !isGlobalCartOffer(item, resolveProductStore(item, products) || {}, products.find((product) => matchesProduct(item, product)), null))) {
    throw new Error('Store details are unavailable. Please retry.');
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return items.map((item) => {
      const source = resolveProductStore(item, products) || {};
      const store = stores.find((entry) => source.storeId ? entry.id === source.storeId : entry.name === source.store || entry.name === source.storeName);
      const product = products.find((entry) => matchesProduct(item, entry));
      if (isGlobalCartOffer(item, source, product, store)) return globalLine(item, source);
      if (store && !isGlobalStore(store)) {
        const storeSource = { ...source, storeId:store.id, store:store.name, storeName:store.name, location:store.location };
        if (storeFulfillmentMethod(store, storeMethods, defaultMethod) === 'pickup') return pickupDeliveryLine(localLine(item, storeSource, null, 'pickup'));
        return { ...localLine(item, storeSource, null, defaultMethod), quoteUnavailable: true, estimatedDelivery: 'Select a delivery address' };
      }
      throw new Error('Store delivery details could not be verified. Please retry.');
    });
  }
  const selectedStore = stores.find((entry) => entry?.id === selectedStoreId);
  return Promise.all(items.map(async (item) => {
    const source = resolveProductStore(item, products) || {};
    const store = stores.find((entry) => source.storeId ? entry.id === source.storeId : entry.name === source.store || entry.name === source.storeName) || (!source.storeId ? selectedStore : null);
    const storeSource = store ? { ...source, storeId: store.id, store: store.name, storeName: store.name, location: store.location } : source;
    const catalogProduct = products.find((product) => matchesProduct(item, product));
    if (isGlobalCartOffer(item, storeSource, catalogProduct, store)) return globalLine(item, storeSource);
    if (!storeSource.storeId || !store) throw new Error('Store delivery details could not be verified. Please retry.');
    const requestedStoreMethod = storeFulfillmentMethod(store, storeMethods, defaultMethod);
    if (requestedStoreMethod === 'pickup') return pickupDeliveryLine(localLine(item, storeSource, null, 'pickup'));
    try {
      const quote = await (cached ? getCachedStoreDeliveryQuote : getStoreDeliveryQuote)(storeSource.storeId, {
        latitude,
        longitude,
        orderTotal: items.filter((entry) => {
          const entrySource = resolveProductStore(entry, products) || {};
          return (entrySource.storeId || entry.storeId) === storeSource.storeId;
        }).reduce((sum, entry) => sum + itemTotal(entry), 0),
        deliveryMethod: requestedStoreMethod,
      });
      if (quote?.deliveryAvailable === false && !quote?.deliveryZoneId) return localLine(item, storeSource, quote, quote?.selectedDeliveryMethod || defaultMethod);
      const requestedMethod = deliveryMethodId(requestedStoreMethod);
      const quotedMethods = (quote?.methods || []).map((entry) => deliveryMethodId(entry.deliveryType));
      const method = requestedMethod === 'scheduled' || quotedMethods.includes(requestedMethod)
        ? requestedStoreMethod
        : preferredDeliveryMethod(quote) || preferredDeliveryMethod({ ...quote, deliveryAvailable: true }) || quote?.selectedDeliveryMethod || requestedStoreMethod;
      return localLine(item, storeSource, quote, method);
    } catch {
      return { ...localLine(item, storeSource, null, defaultMethod), quoteUnavailable: true, estimatedDelivery: 'Delivery check unavailable' };
    }
  }));
};

export const hasGlobalDelivery = (lines = []) => lines.some((line) => line.fulfillmentType === 'global');
