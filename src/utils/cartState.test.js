import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCartItems, replaceSavedItemsForCart } from './cartState.js';

test('saving or restoring one store cart preserves active items from other stores', () => {
  const current = [
    { id: 'a-1', cartId: 'cart-a', storeId: 'a', productId: 'p1' },
    { id: 'b-1', cartId: 'cart-b', storeId: 'b', productId: 'p2' },
  ];
  const updated = { id: 'cart-a', storeId: 'a', items: [{ id: 'a-2', cartId: 'cart-a', storeId: 'a', productId: 'p3' }] };
  assert.deepEqual(mergeCartItems(current, updated.items, updated).map((item) => item.id), ['b-1', 'a-2']);
});

test('saved-item refresh replaces only the matching cart saved items', () => {
  const current = [{ cartId: 'cart-a', id: 'saved-a' }, { cartId: 'cart-b', id: 'saved-b' }];
  assert.deepEqual(replaceSavedItemsForCart(current, [{ cartId: 'cart-a', id: 'saved-a2' }], 'cart-a'), [
    { cartId: 'cart-b', id: 'saved-b' }, { cartId: 'cart-a', id: 'saved-a2' },
  ]);
});
