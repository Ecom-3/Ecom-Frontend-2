import test from 'node:test';
import assert from 'node:assert/strict';
import { slugifyProductName, toStoreManagerProductPayload, validateStoreManagerProductForm } from './storeManagerProductForm.js';

test('creates normalized product slugs and reports required fields', () => {
  assert.equal(slugifyProductName('  Organic Cashew Nuts! '), 'organic-cashew-nuts');
  assert.deepEqual(validateStoreManagerProductForm({ name: 'Cashews', status:'DRAFT' }), {
    sku: 'SKU is required.', categoryId: 'Choose a category.',
  });
});

test('requires a priced variant for active products and validates image URLs', () => {
  assert.match(validateStoreManagerProductForm({ name:'Pickle', sku:'P-1', categoryId:'c1', status:'ACTIVE' }).variants, /active product needs/i);
  assert.match(validateStoreManagerProductForm({ name:'Pickle', sku:'P-1', categoryId:'c1', status:'ACTIVE', variants:[{sku:'V-1',name:'250 g',price:50,active:true}], images:[{url:'javascript:bad'}] }).images, /Google Drive image link/i);
});

test('builds a store-scoped product payload without global promotion flags', () => {
  const payload = toStoreManagerProductPayload({
    categoryId: 'category-1', name: 'Local Pickle', sku: 'LOCAL-1', status: 'DRAFT', available: false,
    globalProduct: true, featured: true, special: true,
  });
  assert.equal(payload.product.slug, 'local-pickle');
  assert.equal(payload.product.status, 'DRAFT');
  assert.equal(payload.product.globalProduct, false);
  assert.equal(payload.product.featured, false);
  assert.equal(payload.product.special, false);
  assert.equal(payload.available, false);
  assert.equal('storeId' in payload, false);
});
