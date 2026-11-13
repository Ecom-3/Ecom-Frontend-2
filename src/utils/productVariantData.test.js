import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductImageUrl, normalizeWeightLabel, parseVariantAttributes, variantChoiceLabel } from './productVariantData.js';

test('variant attributes accept JSON strings and objects, and malformed values stay empty', () => {
  assert.deepEqual(parseVariantAttributes('{"size":"M","color":"Blue"}'), { size: 'M', color: 'Blue' });
  assert.deepEqual(parseVariantAttributes({ weight: '500 g' }), { weight: '500 g' });
  assert.deepEqual(parseVariantAttributes('{invalid'), {});
  assert.deepEqual(parseVariantAttributes('[]'), {});
});

test('variant selectors use choices present in the API attributes', () => {
  assert.equal(variantChoiceLabel({ name: 'Standard', attributes: '{"size":"M","color":"Blue"}' }), 'Size: M · Color: Blue');
  assert.equal(variantChoiceLabel({ name: '500 g', attributes: {} }), '500 g');
  assert.equal(variantChoiceLabel({ name: 'Default', attributes: {} }), '');
});

test('image URL validation rejects known placeholders and unsafe schemes', () => {
  assert.equal(normalizeProductImageUrl('https://loremflickr.com/320/240/food'), '');
  assert.equal(normalizeProductImageUrl('javascript:alert(1)'), '');
  assert.equal(normalizeProductImageUrl('https://cdn.example.test/product.jpg'), 'https://cdn.example.test/product.jpg');
  assert.equal(normalizeProductImageUrl('uploads/product.jpg'), 'uploads/product.jpg');
});

test('weight values use consistent gram and kilogram formatting', () => {
  assert.equal(normalizeWeightLabel('500g'), '500 g');
  assert.equal(normalizeWeightLabel('0.5 kg'), '500 g');
  assert.equal(normalizeWeightLabel('1000 grams'), '1 kg');
  assert.equal(normalizeWeightLabel('1.250 KG'), '1.25 kg');
  assert.equal(normalizeWeightLabel('Size: M'), 'Size: M');
  assert.equal(variantChoiceLabel({ attributes: { weight: '0.5kg' } }), 'Weight: 500 g');
});
