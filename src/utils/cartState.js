export const mergeCartItems = (current = [], incoming = [], { cartId = '', storeId = '' } = {}) => [
  ...current.filter((item) => {
    if (cartId && item.cartId) return item.cartId !== cartId;
    return storeId ? String(item.storeId || '') !== String(storeId) : true;
  }),
  ...incoming,
];

export const replaceSavedItemsForCart = (current = [], incoming = [], cartId = '') => [
  ...current.filter((item) => !cartId || item.cartId !== cartId),
  ...incoming,
];
