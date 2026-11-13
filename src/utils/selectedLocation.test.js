import test from 'node:test';
import assert from 'node:assert/strict';

test('selected delivery location survives page reload through browser storage', async () => {
  const values = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  } };
  try {
    const firstPage = await import(`./selectedLocation.js?first=${Date.now()}`);
    const selected = { source: 'manual', title: 'Bengaluru', city: 'Bengaluru', pincode: '560001', latitude: 12.9716, longitude: 77.5946 };
    firstPage.storeSelectedLocation(selected);
    const reloadedPage = await import(`./selectedLocation.js?reload=${Date.now()}`);
    assert.deepEqual(reloadedPage.readSelectedLocation(), selected);
    reloadedPage.clearSelectedLocation();
    assert.equal(values.size, 0);
  } finally {
    delete globalThis.window;
  }
});
