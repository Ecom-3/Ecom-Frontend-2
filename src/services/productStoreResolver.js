import { isGlobalProduct, isGlobalStore, storeDeliversTo } from '../utils/storeDelivery.js';

const productKey = (product = {}) => product.productId || product.id || product.product_id || '';

const storeInfo = (product = {}) => {
  const storeId = product.storeId || product.sourceStoreId || '';
  const storeName = product.storeName || product.store || product.sourceStore || storeId;
  if (!storeId && !storeName) return null;
  return {
    storeId,
    store: storeName,
    storeName,
    location: product.storeLocation || product.location || '',
    state: product.storeState || product.state || '',
  };
};

// Store associations come from catalog/cart API records; they are never
// inferred from a browser-persisted product/store index.
export const rememberProductStore = (product = {}) => storeInfo(product);

export const resolveProductStore = (product = {}, catalogProducts = []) => {
  const direct = storeInfo(product);
  if (direct) return direct;

  const key = productKey(product);
  const match = catalogProducts.find((item) => productKey(item) === key
    || (product.title && item.title === product.title)
    || (product.productName && item.name === product.productName));
  return storeInfo(match || {});
};
export const resolveProductStoreForLocation = ({ product = {}, requestedStore = null, availableStores = [], stores = [], location = null } = {}) => {
  if (requestedStore?.storeId || requestedStore?.storeName) {
    if (isGlobalStore(requestedStore)) return storeInfo(requestedStore);
    const requestedDirectoryStore = stores.find((store) => String(store.id) === String(requestedStore.storeId));
    if (requestedDirectoryStore && storeDeliversTo(requestedDirectoryStore, location)) {
      return { ...storeInfo(requestedStore), ...requestedDirectoryStore, storeId: requestedDirectoryStore.id };
    }
  }
  if (isGlobalProduct(product)) return { storeId: 'global-store', store: 'India-wide Global Store', storeName: 'India-wide Global Store' };
  return availableStores.map((entry) => {
    const directoryStore = stores.find((store) => String(store.id) === String(entry.storeId));
    return directoryStore ? { ...entry, ...directoryStore, storeId: directoryStore.id } : entry;
  }).find((entry) => isGlobalStore(entry) || storeDeliversTo(entry, location)) || null;
};
