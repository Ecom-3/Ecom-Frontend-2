import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProductStoreForLocation } from './productStoreResolver.js';

const store = { id: 'blr-store', name: 'Bengaluru Store', active: true, status: 'Active', latitude: 12.9716, longitude: 77.5946, deliveryRadiusKm: 12 };

test('product details resolve an available mapped store in the selected delivery area', () => {
  const result = resolveProductStoreForLocation({
    product: { id: 'product-1' },
    availableStores: [{ storeId: store.id, storeName: store.name }],
    stores: [store],
    location: { latitude: 12.9716, longitude: 77.5946 },
  });
  assert.equal(result.storeId, store.id);
});

test('product details do not fall back to an unrelated mapped store', () => {
  const result = resolveProductStoreForLocation({
    product: { id: 'product-1' },
    availableStores: [{ storeId: store.id, storeName: store.name }],
    stores: [store],
    location: { latitude: 17.385, longitude: 78.4867 },
  });
  assert.equal(result, null);
});

test('explicit eligible store selected from product listing is preserved', () => {
  const result = resolveProductStoreForLocation({
    requestedStore: { storeId: 'clicked-store', storeName: 'Clicked Store' },
    availableStores: [{ storeId: 'clicked-store' }],
    stores: [{ ...store, id: 'clicked-store', name: 'Clicked Store' }],
    location: { latitude: 12.9716, longitude: 77.5946 },
  });
  assert.equal(result.storeId, 'clicked-store');
});

test('out-of-area store from a stale product selection is rejected', () => {
  const result = resolveProductStoreForLocation({
    requestedStore: { storeId: store.id, storeName: store.name },
    availableStores: [{ storeId: store.id, storeName: store.name }],
    stores: [store],
    location: { latitude: 12.9716, longitude: 77.5946 },
  });
  assert.equal(result.storeId, store.id);
  const outsideArea = resolveProductStoreForLocation({
    requestedStore: { storeId: store.id, storeName: store.name },
    availableStores: [{ storeId: store.id, storeName: store.name }],
    stores: [store],
    location: { latitude: 17.385, longitude: 78.4867 },
  });
  assert.equal(outsideArea, null);
});

test('global products resolve to the global store', () => {
  const result = resolveProductStoreForLocation({ product: { globalProduct: true } });
  assert.equal(result.storeId, 'global-store');
});
