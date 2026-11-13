import { serviceBaseUrl } from '../config/serviceRoutes.js';
import { apiRequest } from './apiClient';
import { createCartDiagnosticId, logCartDiagnostic, logCartSnapshot } from '../utils/cartDiagnostics.js';
import { createUuid } from '../utils/uuid.js';

const CART_BASE_URL = serviceBaseUrl('cart', import.meta.env);

const buildQueryString = (params = {}) => {
  const search = new URLSearchParams();
  ['customerId', 'storeId'].forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const safeEndpoint = (path) => {
  const pathname = String(path).split('?')[0];
  if (/^\/api\/v1\/carts\/customer\/[^/]+\/active$/.test(pathname)) return '/api/v1/carts/customer/:customerId/active';
  if (pathname === '/api/v1/carts/active') return pathname;
  if (/^\/api\/v1\/carts\/[^/]+\/items\/[^/]+$/.test(pathname)) return '/api/v1/carts/:cartId/items/:cartItemId';
  if (/^\/api\/v1\/carts\/[^/]+\/items$/.test(pathname)) return '/api/v1/carts/:cartId/items';
  if (/^\/api\/v1\/carts\/[^/]+\/calculate-total$/.test(pathname)) return '/api/v1/carts/:cartId/calculate-total';
  if (/^\/api\/v1\/carts\/[^/]+$/.test(pathname)) return '/api/v1/carts/:cartId';
  return pathname;
};

const extractItemId = (path) => {
  const match = String(path).split('?')[0].match(/^\/api\/v1\/carts\/[^/]+\/items\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
};

const request = async (path, options = {}) => {
  const method = options.method || 'GET';
  const endpoint = safeEndpoint(path);
  const correlationId = createCartDiagnosticId();
  const body = options.body ? (() => {
    try { return JSON.parse(options.body); } catch { return {}; }
  })() : {};
  const query = new URLSearchParams(String(path).split('?')[1] || '');
  const idempotencyId = options.headers?.['Idempotency-Key'] || options.headers?.['idempotency-key'];
  const requestFields = {
    storeId: body.storeId || query.get('storeId') || undefined,
    productId: body.productId,
    variantId: body.variantId,
    cartItemId: extractItemId(path),
    quantity: body.quantity,
    source: 'server API',
    method,
    endpoint,
    idempotencyId,
    correlationId,
  };
  logCartDiagnostic('api.request', requestFields);
  try {
    const result = await apiRequest(CART_BASE_URL, path, options);
    const items = Array.isArray(result?.items) ? result.items : Array.isArray(result?.cartItems) ? result.cartItems : [];
    const responseFields = { storeId: result?.storeId, source: 'server API', method, endpoint, idempotencyId, correlationId };
    logCartSnapshot('api.response.item', items.map((item) => ({ ...item, storeId: item.storeId || result?.storeId })), 'server API', responseFields);
    if (!items.length) logCartDiagnostic('api.response', responseFields);
    return result;
  } catch (error) {
    logCartDiagnostic('api.failure', requestFields);
    throw error;
  }
};

export const createCart = async (data) => request('/api/v1/carts', { method: 'POST', body: JSON.stringify(data) });

export const getCart = async (cartId) => request(`/api/v1/carts/${encodeURIComponent(cartId)}`);

export const getActiveCart = async ({ customerId, storeId }) => request(`/api/v1/carts/active${buildQueryString({ customerId, storeId })}`);

export const getActiveCarts = async (customerId) => request(`/api/v1/carts/customer/${encodeURIComponent(customerId)}/active`);

export const addCartItem = async (cartId, data, key = createUuid()) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/items`, { method: 'POST', body: JSON.stringify(data), headers: { 'Idempotency-Key': key } });

export const updateCartItem = async (cartId, itemId, data) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: JSON.stringify(data) });

export const removeCartItem = async (cartId, itemId) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });

export const clearCartItems = async (cartId) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/items`, { method: 'DELETE' });

export const saveCartItemForLater = async (cartId, itemId) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}/save-for-later`, { method: 'PATCH' });

export const moveSavedCartItemToCart = async (cartId, itemId) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}/move-to-cart`, { method: 'PATCH' });

export const removeSavedCartItemForLater = async (cartId, itemId) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}/saved-for-later`, { method: 'DELETE' });

export const calculateCartTotal = async (cartId) => request(`/api/v1/carts/${encodeURIComponent(cartId)}/calculate-total`, { method: 'POST' });
