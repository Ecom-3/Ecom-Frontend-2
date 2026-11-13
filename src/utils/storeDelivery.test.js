import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryProducts, isGlobalProduct, isProductEligibleForStore, withGlobalStoreFallback } from './storeDelivery.js';
import { balancedStoreProductPreview } from './storeProductListings.js';

test('preview includes nearby stores and global offers without changing prices', () => {
  const rows = ['a', 'b', 'global-store'].flatMap((storeId) => [1,2,3].map((id) => ({ id, storeId, price: id * 100, fulfillmentType: storeId === 'global-store' ? 'global' : 'nearby' })));
  const preview = balancedStoreProductPreview(rows);
  assert.deepEqual(preview.map((item) => item.storeId), ['a','b','global-store','a','b','global-store']);
  assert.equal(preview[2].price, 100);
});

test('global API flag retains India-wide offer beside a local offer', () => {
  const product = { id: 'p1', title: 'Test product', globalProduct: true, price: 100 };
  assert.equal(isGlobalProduct(product), true);
  const stores = [{ id: 'local', name: 'Local', active: true, latitude: 17, longitude: 78, deliveryRadiusKm: 10 }];
  const mappings = [{ productId: 'p1', storeId: 'local', product, available: true }];
  const rows = deliveryProducts([product], mappings, stores, { latitude: 17, longitude: 78 });
  assert.deepEqual(rows.map((row) => row.storeId), ['local', 'global-store']);
  assert.equal(rows[1].price, 100);
});

test('store directory supplies the nationwide fallback when no global store record exists', () => {
  const stores = withGlobalStoreFallback([{ id: 'local', name: 'Local', active: true }]);
  assert.deepEqual(stores.map((store) => store.id), ['local', 'global-store']);
  assert.equal(withGlobalStoreFallback([])[0].id, 'global-store');
  assert.equal(withGlobalStoreFallback(stores).length, 2);
});

test('local offers wait for a resolved customer location while global offers remain nationwide', () => {
  const local = { id: 'local-product', globalProduct: false, price: 80 };
  const global = { id: 'global-product', globalProduct: true, price: 120 };
  const stores = [{ id: 'hyd-store', name: 'Hyderabad Store', active: true, latitude: 17, longitude: 78, deliveryRadiusKm: 10 }];
  const mappings = [
    { productId: 'local-product', storeId: 'hyd-store', product: local, available: true },
    { productId: 'global-product', storeId: 'hyd-store', product: global, available: true },
  ];

  assert.deepEqual(deliveryProducts([local, global], mappings, stores, null).map((item) => item.productId || item.id), ['global-product']);
  const farAway = deliveryProducts([local, global], mappings, stores, { latitude: 28.6, longitude: 77.2 });
  assert.ok(farAway.some((item) => item.id === 'global-product' && item.storeId === 'global-store'));
  assert.ok(!farAway.some((item) => item.id === 'local-product'));
});

test('global store eligibility uses the same product flag as checkout', () => {
  const globalStore = { id: 'global-store', name: 'India-wide Global Store', active: true };
  const localStore = { id: 'local-store', name: 'Local Store', active: true };
  assert.equal(isProductEligibleForStore({ globalProduct: true }, globalStore), true);
  assert.equal(isProductEligibleForStore({ globalProduct: false }, globalStore), false);
  assert.equal(isProductEligibleForStore({ globalProduct: false }, localStore), true);
});
