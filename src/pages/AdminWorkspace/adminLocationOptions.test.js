import test from 'node:test';
import assert from 'node:assert/strict';
import { adminLocationLookupOptions } from './adminLocationOptions.js';

test('admin location lookup includes API locations and store locations without duplicates', () => {
  assert.deepEqual(
    adminLocationLookupOptions(
      [{ name: 'Hyderabad', city: 'Hyderabad' }, { city: 'Chennai' }, { name: ' hyderabad ' }],
      [{ location: 'Chennai' }, { location: 'Mumbai' }],
    ),
    ['Chennai', 'Hyderabad', 'Mumbai'],
  );
});

test('admin location lookup tolerates missing or malformed lists', () => {
  assert.deepEqual(adminLocationLookupOptions(null, [{ location: 'Hyderabad' }]), ['Hyderabad']);
});

test('admin location lookup accepts strings and common API location fields', () => {
  assert.deepEqual(
    adminLocationLookupOptions(
      ['Delhi', { locationName: ' Bengaluru ' }, { name: 'Kochi' }],
      [{ city: 'Delhi' }, { locationName: 'Mumbai' }],
    ),
    ['Bengaluru', 'Delhi', 'Kochi', 'Mumbai'],
  );
});
