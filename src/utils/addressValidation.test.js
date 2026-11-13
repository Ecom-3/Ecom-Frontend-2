import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAddressFields } from './addressValidation.js';
const valid = { houseNumber: '12-A', floor: 'Ground', landmark: 'Community hall', phone: '9398987413', manualMode: true, manualLocation: { street: 'SR Nagar', village: 'Srinivas Nagar', city: 'Hyderabad', state: 'Telangana', pincode: '500038' } };
test('missing house number does not report an error for a valid phone', () => {
  assert.deepEqual(validateAddressFields({ ...valid, houseNumber: ' ' }), { houseNumber: 'Enter your house number, building name or area.' });
});
test('reports each missing field and invalid PIN and mobile independently', () => {
  const errors = validateAddressFields({ ...valid, floor: '', landmark: '', phone: '1234567890', manualLocation: { street: '', village: '', city: '', state: '', pincode: '50003' } });
  assert.deepEqual(Object.keys(errors), ['street', 'village', 'city', 'state', 'pincode', 'floor', 'landmark', 'phone']);
  assert.deepEqual(validateAddressFields(valid), {});
  assert.deepEqual(validateAddressFields({ ...valid, manualMode: false, manualLocation: {} }), {});
});
