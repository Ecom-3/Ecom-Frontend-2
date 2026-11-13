import test from 'node:test';
import assert from 'node:assert/strict';
import { assignGlobalStore, buildAddressPayload, buildOrderAddressesPayload, getGlobalStoreAssignmentOptions, getOrder, isGlobalOrder, normalizeOrder } from './orderApi.js';

const withFetch = async (fetchImpl, callback) => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.sessionStorage;
  globalThis.fetch = fetchImpl;
  globalThis.sessionStorage = { getItem: () => 'test-token' };
  try { await callback(); }
  finally { globalThis.fetch = previousFetch; globalThis.sessionStorage = previousStorage; }
};

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('order payload keeps the selected saved address id and structured snapshot', () => {
  const selected = { id: 'address-A', addressLine1: '18 Lake Road', addressLine2: 'Flat 2', city: 'Hyderabad', state: 'Telangana', country: 'India', postalCode: '500084', recipientName: 'A Customer', recipientPhone: '9876543210' };
  const payload = buildAddressPayload(selected, 'different fallback text');
  assert.equal(payload.sourceAddressId, 'address-A');
  assert.equal(payload.addressLine1, '18 Lake Road');
  assert.equal(payload.postalCode, '500084');
  assert.deepEqual(buildOrderAddressesPayload(selected)[0], { ...payload, addressType: 'SHIPPING' });
});

test('order address payload preserves the selected checkout address without repeating its locality', () => {
  const selected = {
    id: 'address-B',
    address: 'Srinivas Nagar, SR Nagar, Ward 98 Ameerpet, Hyderabad, Telangana, 500038, India, Hyderabad, Telangana, India, 500038',
    manualLocation: { street: 'SR Nagar', village: 'Srinivas Nagar', city: 'Hyderabad', state: 'Telangana', pincode: '500038' },
  };
  const payload = buildAddressPayload(selected);
  assert.equal(payload.addressLine1, 'SR Nagar, Srinivas Nagar');
  assert.equal(payload.addressLine2, null);
  assert.equal(payload.city, 'Hyderabad');
  assert.equal(payload.state, 'Telangana');
  assert.equal(payload.postalCode, '500038');
});

test('synthetic location and historical order address do not become saved address references', () => {
  assert.equal(buildAddressPayload({ id: 'selected-location', addressLine1: 'Map pin' }).sourceAddressId, null);
  assert.equal(buildAddressPayload({ id: 'order-address-id', fromOrder: true, addressLine1: 'Old snapshot' }).sourceAddressId, null);
});

test('normalizes pickup orders as Store Pickup instead of showing a delivery ETA', () => {
  const order = normalizeOrder({
    id: 'pickup-order',
    deliveryMethod: 'pickup',
    items: [{ productId: 'product-1', deliveryMethod: 'pickup' }],
  });

  assert.equal(order.deliveryType, 'pickup');
  assert.equal(order.deliveryLabel, 'Store Pickup');
  assert.equal(order.items[0].deliveryLabel, 'Store Pickup');
});

test('global order checks tolerate a missing order during async rendering', () => {
  assert.equal(isGlobalOrder(null), false);
});

test('global assignment workflow loads a backend-only order and stocked options without local order storage', async () => {
  const calls = [];
  await withFetch(async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('global-store-assignment-options')) return jsonResponse([{ storeId: 'store-hyd', items: [{ productName: 'Pickle jar', requestedQuantity: 2, availableQuantity: 5, available: true }] }]);
    return jsonResponse({ id: 'backend-order-only', storeId: 'global-store', fulfillmentType: 'global', items: [] });
  }, async () => {
    const order = await getOrder('backend-order-only');
    const options = await getGlobalStoreAssignmentOptions(order.id);
    assert.equal(order.id, 'backend-order-only');
    assert.equal(options[0].storeId, 'store-hyd');
    assert.equal(calls.length, 2);
    assert.ok(calls.every(({ options: requestOptions }) => requestOptions.headers.Authorization === 'Bearer test-token'));
  });
});

test('assignment sends the selected store to the authenticated backend operation', async () => {
  await withFetch(async (url, options) => {
    assert.match(String(url), /\/api\/v1\/orders\/backend-order-only\/global-store-assignment$/);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(options.body), { storeId: 'store-hyd' });
    return jsonResponse({ id: 'backend-order-only', globalAssignedStoreId: 'store-hyd', globalApproval: 'Approved' });
  }, async () => {
    const result = await assignGlobalStore('backend-order-only', 'store-hyd');
    assert.equal(result.globalAssignedStoreId, 'store-hyd');
  });
});
