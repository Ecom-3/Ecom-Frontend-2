import test from 'node:test';
import assert from 'node:assert/strict';
import { addressFieldsFromLocation, fillMissingAddressFields } from './addressPrefill.js';

test('prefills available location fields without inventing missing values', () => {
  assert.deepEqual(addressFieldsFromLocation({ street: 'Road', city: 'Hyderabad', state: 'Telangana', pincode: '500038' }), { street: 'Road', village: '', city: 'Hyderabad', state: 'Telangana', pincode: '500038' });
  assert.equal(addressFieldsFromLocation({ title: 'Area' }).pincode, '');
});
test('late lookup preserves user edits and fills only missing fields', () => {
  assert.deepEqual(fillMissingAddressFields({ street: 'My road', village: '', city: '', state: '', pincode: '500001' }, { street: 'Other road', village: 'SR Nagar', city: 'Hyderabad', state: 'Telangana', pincode: '500038' }), { street: 'My road', village: 'SR Nagar', city: 'Hyderabad', state: 'Telangana', pincode: '500001' });
});
