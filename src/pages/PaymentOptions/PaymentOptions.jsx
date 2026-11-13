import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Collapse, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkoutPolicyError, checkoutReviewError } from '../../utils/checkoutPolicy';
import { AppContext } from '../../context/AppContext';
import { buildOrderAddressesPayload, buildOrderItemsPayload, createOrder, getOrder, normalizeOrder, retrySavedOrder } from '../../services/orderApi';
import { createPayment, getPayment, getPaymentByOrder, getPaymentStatus, normalizePayment } from '../../services/paymentApi';
import { getProduct } from '../../services/catalogApi';
import { checkoutErrorMessage, validateCartProducts, validateGlobalCheckout } from '../../utils/globalCheckout';
import './PaymentOptions.css';
import { getPaymentCapabilities } from '../../services/paymentApi';
import { requirePaymentProcessing } from '../../utils/paymentAvailability';
import * as cartApi from '../../services/cartApi';
import { prepareCheckoutCart, finishCheckoutCart } from '../../utils/checkoutCart';
import { createCheckoutGroup, getCheckoutGroupByKey, getCheckoutGroupByCart } from '../../services/orderApi';
import { persistStoreCheckout } from '../../utils/persistedStoreCheckout';
import { getPublicInventoryAvailability } from '../../services/inventoryApi';
import { validateCheckoutAvailability } from '../../utils/checkoutAvailability';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage';

const methods = [
  { id:'upi',label:'UPI',paymentMethod:'DEMO_UPI',displayMethod:'UPI',icon:<PhoneAndroidIcon/>,caption:'Pay using UPI' },
  { id:'card',label:'Cards',paymentMethod:'DEMO_CARD',displayMethod:'Card',icon:<CreditCardIcon/>,caption:'Pay using card' },
  { id:'cod',label:'COD',paymentMethod:'DEMO_COD',displayMethod:'Cash on Delivery',icon:<PaymentsOutlinedIcon/>,caption:'Pay when the order arrives' },
];
const displayPaymentMethod = (paymentMethod = '') => methods.find((item) => item.paymentMethod === paymentMethod)?.displayMethod || paymentMethod;

const paymentStatusText = {
  PENDING: 'Payment is pending confirmation.',
  SUCCESS: 'Payment Service confirmed this payment.',
  FAILED: 'Payment Service reported a failed payment.',
  REFUNDED: 'Payment Service reported this payment as refunded.',
};
const GLOBAL_STORE_ID = 'global-store';
const GLOBAL_STORE_NAME = 'India-wide Global Store';
const COMPLETED_CHECKOUT_RETURN_KEY = 'freshcart.completedCheckoutReturnToCart';
const promotionLocationFor = (checkout = {}) => String(checkout.customerLocation || '').trim().slice(0, 150);
const isPaidOrderStatus = (status) => ['PAID', 'SUCCESS'].includes(String(status || '').toUpperCase());
const tokenCustomerId = () => {
  try {
    const token = sessionStorage.getItem('authToken') || '';
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.customerId || '';
  } catch {
    return '';
  }
};
const cartItemKey = (item = {}) => `${item.storeId || item.sourceStoreId || item.store || item.storeName || 'store'}:${item.productId || item.id || ''}:${item.variantId ?? 'product'}`;
const lineForCartItem = (item = {}, lines = [], index = 0) =>
  lines.find((line) => line.key === cartItemKey(item))
  || lines.find((line) => line.storeId && [item.storeId, item.sourceStoreId].includes(line.storeId) && line.productId === item.productId && (line.variantId ?? null) === (item.variantId ?? null))
  || lines.find((line) => line.productId === item.productId && (line.variantId ?? null) === (item.variantId ?? null))
  || lines[index]
  || {};
const splitKeysFor = (items = [], lines = []) => [...new Set(items.map((item, index) => {
  const line = lineForCartItem(item, lines, index);
  return `${line.fulfillmentType || item.fulfillmentType || 'nearby'}:${line.storeId || item.storeId || item.sourceStoreId || item.store || item.storeName || 'store'}:${line.deliveryType || item.deliveryType || 'standard'}`;
}))];
const splitGroupsFor = (items = [], lines = []) => items.reduce((groups, item, index) => {
  const line = lineForCartItem(item, lines, index);
  const key = `${line.fulfillmentType || item.fulfillmentType || 'nearby'}:${line.storeId || item.storeId || item.sourceStoreId || item.store || item.storeName || 'store'}:${line.deliveryType || item.deliveryType || 'standard'}`;
  const existing = groups.find((group) => group.key === key);
  const group = existing || { key, line, items: [] };
  group.items.push(item);
  if (!existing) groups.push(group);
  return groups;
}, []);

const resolveCheckoutStoreId = ({ activeCart, checkout = {}, cartItems = [] } = {}) => {
  const lines = checkout.deliveryLines || [];
  return activeCart?.storeId
    || lines.find((line) => line.storeId)?.storeId
    || checkout.sourceStoreId
    || cartItems.find((item) => item.storeId)?.storeId
    || cartItems.find((item) => item.sourceStoreId)?.sourceStoreId
    || '';
};

const PaymentOptions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCart, addresses, cartItems, clearCartAfterCheckout, formatCurrency, user, catalogStores, catalogProducts } = useContext(AppContext);
  const customerId = tokenCustomerId() || user?.id || '';
  const checkout = useMemo(() => {
    if (location.state?.checkout) return location.state.checkout;
    try { return JSON.parse(sessionStorage.getItem('metaarch.checkoutDraft') || '{}'); } catch { return {}; }
  }, [location.state]);
  useEffect(() => { if (Object.keys(checkout).length) sessionStorage.setItem('metaarch.checkoutDraft', JSON.stringify(checkout)); }, [checkout]);
  const existingOrderId = location.state?.orderId || location.state?.order?.id || '';
  const existingOrder = useMemo(() => location.state?.order ? normalizeOrder(location.state.order) : null, [location.state]);
  const [preferredMethod,setMethod] = useState('cod');
  const [onlinePaymentsEnabled,setOnlinePaymentsEnabled] = useState(false);
  const method = onlinePaymentsEnabled ? preferredMethod : 'cod';
  const [status,setStatus] = useState('selecting');
  const [summaryOpen,setSummaryOpen] = useState(true);
  const [error,setError] = useState('');
  const [result,setResult] = useState(null);
  const [payment,setPayment] = useState(null);
  const persistedMultiStore = import.meta.env.VITE_PERSISTED_MULTI_STORE_CHECKOUT !== 'false';
  const multiStoreCart = !existingOrderId && splitKeysFor(cartItems, checkout.deliveryLines || []).length > 1;
  const submissionBusy = useRef(false);

  useEffect(() => {
    if (!user?.id) {
      navigate('/login', { replace: true, state: { from: '/checkout', completeProfile: true, checkoutIntent: true } });
    }
  }, [navigate, user?.id]);

  useEffect(() => {
    if (sessionStorage.getItem(COMPLETED_CHECKOUT_RETURN_KEY)) navigate('/cart', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let active = true;
    getPaymentCapabilities()
      .then((capabilities) => {
        if (active) setOnlinePaymentsEnabled(capabilities?.processingEnabled === true);
      })
      .catch(() => {
        if (active) setOnlinePaymentsEnabled(false);
      });
    return () => { active = false; };
  }, []);

  const selectableMethods = useMemo(
    () => onlinePaymentsEnabled ? methods : methods.filter((item) => item.id === 'cod'),
    [onlinePaymentsEnabled],
  );

  const selectedMethod = selectableMethods.some((item) => item.id === method) ? method : 'cod';

  const summary = useMemo(() => {
    const subtotal = cartItems.reduce((sum,item)=>sum+Number(item.price)*Number(item.quantity),0);
    const delivery = Number(checkout.deliveryFee || 0);
    const storeCount = new Set(cartItems.map((item, index) => {
      const line = lineForCartItem(item, checkout.deliveryLines || [], index);
      if (line.fulfillmentType === 'global' || line.storeId === GLOBAL_STORE_ID
          || item.storeId === GLOBAL_STORE_ID || item.sourceStoreId === GLOBAL_STORE_ID) return null;
      return line.storeId || item.storeId || item.sourceStoreId || item.store || item.storeName;
    }).filter(Boolean)).size;
    const handling = multiStoreCart ? storeCount * 5 : Number(checkout.handlingFee ?? (cartItems.length ? 5 : 0));
    const discount = Number(checkout.discount || 0);
    const orderTotal = Number(existingOrder?.totalAmount || 0);
    return { subtotal,delivery,handling,discount,total:orderTotal || (multiStoreCart ? subtotal+delivery+handling-discount : Number(checkout.total ?? subtotal+delivery+handling-discount)) };
  },[cartItems,checkout,existingOrder,multiStoreCart]);

  const checkoutBlock = multiStoreCart && !persistedMultiStore
    ? 'Persisted multi-store checkout is not enabled on this service stack. No orders or payments were submitted.'
    : !(persistedMultiStore && !existingOrderId) && !existingOrderId
      ? checkoutPolicyError({ groupCount: splitKeysFor(cartItems, checkout.deliveryLines || []).length, handlingFee: summary.handling, discount: summary.discount, coupon: checkout.coupon, promotionVerified:Boolean(checkout.promotionVerified), globalOrder: checkout.fulfillmentType === 'global' || checkout.sourceStoreId === GLOBAL_STORE_ID })
      : '';
  const storeNameFor = (order = {}) => {
    const storeId = order.sourceStoreId || order.storeId || '';
    const store = catalogStores.find((item) => item.id === storeId || item.name === order.sourceStore || item.name === order.store);
    return order.sourceStore || order.store || store?.name || storeId || 'Store';
  };

  const resolveError = checkoutErrorMessage;

  const verifyGlobalItems = () => validateGlobalCheckout(
    splitGroupsFor(cartItems, checkout.deliveryLines || []).map(group => ({
      ...group,
      line: {
        ...group.line,
        storeId: group.line.storeId || group.items[0]?.storeId || group.items[0]?.sourceStoreId,
        fulfillmentType: group.line.storeId || group.items[0]?.storeId || group.items[0]?.sourceStoreId
          ? (group.line.storeId || group.items[0]?.storeId || group.items[0]?.sourceStoreId) === GLOBAL_STORE_ID ? 'global' : 'nearby'
          : group.line.fulfillmentType || group.items[0]?.fulfillmentType,
      },
    })),
    getProduct,
  );

  const validate = (retrySaved = false) => {
    if (!customerId) return 'Log in before placing an order.';
    if (!selectableMethods.some((item) => item.id === selectedMethod)) return 'Select a supported payment method.';
    if (existingOrderId) return '';
    if (retrySaved) return '';
    if (!cartItems.length) return 'Your cart is empty.';
    if (!activeCart?.id && !checkout.deliveryLines?.length) return 'Cart Service has not returned an active cart yet.';
    if (!resolveCheckoutStoreId({ activeCart, checkout, cartItems })) return 'Select a store before placing an order.';
    return '';
  };

  const createOrLoadOrder = async (retrySaved = false) => {
    if (existingOrderId) return normalizeOrder(await getOrder(existingOrderId));
    if (retrySaved) {
      const storeId = resolveCheckoutStoreId({ activeCart, checkout, cartItems });
      if (!storeId) throw new Error('Select the store for the saved checkout before retrying.');
      return normalizeOrder(await retrySavedOrder(customerId, storeId));
    }
    await validateCartProducts(cartItems, getProduct);
    await verifyGlobalItems();
    const deliveryLines = checkout.deliveryLines || [];
    const splitKeys = splitKeysFor(cartItems, deliveryLines);
    // A multi-store cart is submitted as one order per store below. Validate
    // the checkout totals and promotion, but do not apply the single-store rule.
    const policyError = splitKeys.length > 1
      ? checkoutReviewError({ groupCount: splitKeys.length, handlingFee: summary.handling, discount: summary.discount, coupon: checkout.coupon, promotionVerified:Boolean(checkout.promotionVerified) })
      : checkoutPolicyError({ groupCount: splitKeys.length, handlingFee: summary.handling, discount: summary.discount, coupon: checkout.coupon, promotionVerified:Boolean(checkout.promotionVerified), globalOrder: checkout.fulfillmentType === 'global' || checkout.sourceStoreId === GLOBAL_STORE_ID });
    if (policyError) throw new Error(policyError);
    const hasGlobalLine = deliveryLines.some((line) => line.fulfillmentType === 'global') || ['global','mixed'].includes(checkout.fulfillmentType);
    const useLocalSplitOrder = hasGlobalLine || splitKeys.length > 1;
    if (useLocalSplitOrder) {
      const defaultAddress = checkout.selectedAddressSnapshot || addresses.find((address) => address.id === checkout.selectedAddressId) || addresses.find((address) => address.isDefault) || addresses[0] || {};
      const groups = splitGroupsFor(cartItems, deliveryLines);
      if(checkout.coupon && groups.length>1) throw new Error('Coupon checkout requires the verified combined checkout service. Please retry after combined checkout is available.');
        const childOrders = await Promise.all(groups.map(async (group, index) => {
          const line = group.line || {};
          const firstItem = group.items[0] || {};
          const groupIsGlobal = line.fulfillmentType === 'global' || String(line.deliveryType || '').toLowerCase() === 'global';
          const storeId = line.storeId || firstItem.storeId || firstItem.sourceStoreId || checkout.sourceStoreId;
          if (!storeId) throw new Error('Store ID is required before placing this order.');
          const orderStoreId = groupIsGlobal ? GLOBAL_STORE_ID : storeId;
          const groupSubtotal = group.items.reduce((sum, item) => sum + Number(item.price || item.unitPrice || 0) * Number(item.quantity || 0), 0);
          const groupDelivery = Number(line.deliveryCharge || 0);
          const deliveryQuote = line.quote || checkout.deliveryQuote || {};
          const serverCart = await prepareCheckoutCart(customerId, orderStoreId, buildOrderItemsPayload(group.items), cartApi, sessionStorage, true);
          const order = normalizeOrder(await createOrder({
            customerId,
            cartId: serverCart.id,
            storeId: orderStoreId,
            items: buildOrderItemsPayload(group.items),
            addresses: buildOrderAddressesPayload({ ...defaultAddress, selectedAddressId: checkout.selectedAddressId }, checkout.deliveryAddress, { name: user?.name, phone: checkout.contactNumber || user?.phone || user?.mobile }),
            notes: checkout.notes || '',
            deliveryZoneId: deliveryQuote.deliveryZoneId || null,
            calculatedDistanceKm: deliveryQuote.distanceKm || null,
            routeDistanceMeters: deliveryQuote.routeDistanceMeters || null,
            routeDurationSeconds: deliveryQuote.routeDurationSeconds || null,
            routeDurationMinutes: deliveryQuote.routeDurationMinutes || null,
            matchedZoneLabel: deliveryQuote.matchedZoneLabel || null,
            customerLatitude: checkout.customerLatitude || null,
            customerLongitude: checkout.customerLongitude || null,
            storeLatitude: deliveryQuote.storeLatitude || checkout.storeLatitude || null,
            storeLongitude: deliveryQuote.storeLongitude || checkout.storeLongitude || null,
            deliveryMethod: groupIsGlobal ? 'global' : (line.deliveryType || deliveryQuote.selectedDeliveryMethod || checkout.method || 'standard'),
            fulfillmentType: groupIsGlobal ? 'global' : line.deliveryType === 'pickup' ? 'pickup' : (line.fulfillmentType || 'nearby'),
            deliveryCharge: groupDelivery,
            estimatedDeliveryMin: deliveryQuote.estimatedDeliveryMin || null,
            estimatedDeliveryMax: deliveryQuote.estimatedDeliveryMax || null,
            freeDeliveryAbove: deliveryQuote.freeDeliveryAbove || null,
            freeDeliveryApplied: Boolean(deliveryQuote.freeDeliveryApplied),
            scheduledDeliveryDate: line.scheduleDate || null,
            scheduledDeliverySlot: line.scheduleSlot || null,
            pickupDetails: line.pickupDetails || null,
            couponCode: checkout.coupon || '',
            promotionLocation: promotionLocationFor(checkout),
            paymentStatus: 'PENDING',
          }));
          return {
            ...order,
            splitIndex: index + 1,
            items: order.items.length ? order.items.map((item) => ({ ...item, sourceStore:firstItem.store || firstItem.sourceStore || line.storeName, deliveryLabel:line.deliveryLabel, estimatedDelivery:line.estimatedDelivery })) : group.items,
            sourceStore:groupIsGlobal ? GLOBAL_STORE_NAME : (firstItem.store || firstItem.sourceStore || line.storeName || storeId),
            sourceStoreId:orderStoreId,
            originalSourceStore:firstItem.store || firstItem.sourceStore || line.storeName || storeId,
            originalSourceStoreId:storeId,
            store:groupIsGlobal ? GLOBAL_STORE_NAME : (firstItem.store || firstItem.sourceStore || line.storeName || storeId),
            storeId:orderStoreId,
            fulfillmentType:groupIsGlobal ? 'global' : (line.fulfillmentType || 'nearby'),
            globalApproval:groupIsGlobal ? 'Pending' : 'Not Required',
            deliveryLines:[line],
            deliveryLabel:line.deliveryLabel,
            estimatedDelivery:line.estimatedDelivery,
            totalAmount:Number(order.totalAmount || groupSubtotal + groupDelivery),
            total:Number(order.totalAmount || groupSubtotal + groupDelivery),
          };
        }));
        const combinedTotal = childOrders.reduce((total, order) => total + Number(order.totalAmount || order.total || 0), 0);
        return { ...childOrders[0], totalAmount:combinedTotal, total:combinedTotal, childOrders };
    }
    const defaultAddress = checkout.selectedAddressSnapshot || addresses.find((address) => address.id === checkout.selectedAddressId) || addresses.find((address) => address.isDefault) || addresses[0] || {};
    const deliveryQuote = checkout.deliveryQuote || {};
    const primaryLine = deliveryLines[0] || {};
    const storeId = resolveCheckoutStoreId({ activeCart, checkout, cartItems }) || primaryLine.storeId;
    if (!storeId) throw new Error('Store ID is required before placing this order.');
    const serverCart = await prepareCheckoutCart(customerId, storeId, buildOrderItemsPayload(cartItems), cartApi, sessionStorage, true);
      return normalizeOrder(await createOrder({
        customerId,
        cartId: serverCart.id,
        storeId,
        items: buildOrderItemsPayload(cartItems),
        addresses: buildOrderAddressesPayload({ ...defaultAddress, selectedAddressId: checkout.selectedAddressId }, checkout.deliveryAddress, { name: user?.name, phone: checkout.contactNumber || user?.phone || user?.mobile }),
        notes: checkout.notes || '',
        deliveryZoneId: deliveryQuote.deliveryZoneId || null,
        calculatedDistanceKm: deliveryQuote.distanceKm || null,
        routeDistanceMeters: deliveryQuote.routeDistanceMeters || null,
        routeDurationSeconds: deliveryQuote.routeDurationSeconds || null,
        routeDurationMinutes: deliveryQuote.routeDurationMinutes || null,
        matchedZoneLabel: deliveryQuote.matchedZoneLabel || null,
        customerLatitude: checkout.customerLatitude || null,
        customerLongitude: checkout.customerLongitude || null,
        storeLatitude: checkout.storeLatitude || null,
        storeLongitude: checkout.storeLongitude || null,
        deliveryMethod: primaryLine.fulfillmentType === 'global' ? 'global' : primaryLine.deliveryType || deliveryQuote.selectedDeliveryMethod || checkout.method || 'standard',
        fulfillmentType: primaryLine.fulfillmentType || (primaryLine.deliveryType === 'pickup' ? 'pickup' : checkout.fulfillmentType || 'nearby'),
        deliveryCharge: Number(primaryLine.deliveryCharge ?? checkout.deliveryFee ?? deliveryQuote.deliveryCharge ?? 0),
        estimatedDeliveryMin: deliveryQuote.estimatedDeliveryMin || null,
        estimatedDeliveryMax: deliveryQuote.estimatedDeliveryMax || null,
        freeDeliveryAbove: deliveryQuote.freeDeliveryAbove || null,
        freeDeliveryApplied: Boolean(deliveryQuote.freeDeliveryApplied),
        scheduledDeliveryDate: primaryLine.scheduleDate || checkout.date || null,
        scheduledDeliverySlot: primaryLine.scheduleSlot || checkout.slot || null,
        pickupDetails: primaryLine.pickupDetails || (checkout.pickupStore ? `Pickup from ${checkout.pickupStore}` : null),
        couponCode: checkout.coupon || '',
        promotionLocation: promotionLocationFor(checkout),
        paymentStatus: 'PENDING',
      }));
  };

  const createOrLoadPayment = async (order, paymentMethod, amount) => {
    try {
      return normalizePayment(await createPayment({
        orderId: order.id,
        customerId,
        amount,
        currency: 'INR',
        paymentMethod,
      }));
    } catch (reason) {
      if (Number(reason?.status) !== 409) throw reason;
      return normalizePayment(await getPaymentByOrder(order.id));
    }
  };

  const lookupCheckoutInventory = async (query) => {
    return getPublicInventoryAvailability(query);
  };

  const pay = async (retrySaved = false) => {
    if (status === 'submitting' || submissionBusy.current) return;
    if (checkoutBlock) return;
    const selectedPaymentMethod = selectableMethods.find((item) => item.id === method)?.paymentMethod || 'DEMO_COD';
    if (!existingOrderId && selectedPaymentMethod === 'DEMO_COD' && !(persistedMultiStore && multiStoreCart)) {
      const validation = validate(retrySaved);
      if (validation) { setError(validation); setStatus('failed'); return; }
      submissionBusy.current = true;
      setStatus('submitting');
      setError('');
      try {
        const order = await createOrLoadOrder(retrySaved);
        const payableAmount = Number(order.totalAmount || order.total || summary.total || 0);
        if (!order.id || !(payableAmount > 0)) throw new Error('Order Service did not return a valid saved order.');
        let pendingPayment = null;
        if (!order.childOrders?.length) {
          for (let attempt = 0; attempt < 4 && !pendingPayment; attempt += 1) {
            try {
              if (attempt > 0) await new Promise((resolve) => window.setTimeout(resolve, 450));
              pendingPayment = normalizePayment(await getPaymentByOrder(order.id));
            } catch {
              pendingPayment = null;
            }
          }
        }
        if (!existingOrderId) {
          for (const storeOrder of order.childOrders || [order]) finishCheckoutCart(customerId, storeOrder.storeId);
          if (!retrySaved) clearCartAfterCheckout();
          sessionStorage.removeItem('metaarch.checkoutDraft');
        }
        setResult({ order, payment: { ...(pendingPayment || {}), status: pendingPayment?.status || 'PENDING', amount: payableAmount, paymentMethod: pendingPayment?.paymentMethod || selectedPaymentMethod, paymentId: pendingPayment?.paymentId || '' } });
        sessionStorage.setItem(COMPLETED_CHECKOUT_RETURN_KEY, order.id);
        setStatus('succeeded');
      } catch (reason) {
        setError(resolveError(reason));
        setStatus('failed');
      } finally {
        submissionBusy.current = false;
      }
      return;
    }
    if (persistedMultiStore && multiStoreCart && !existingOrderId) {
      const validation = validate(retrySaved);
      if (validation) { setError(validation); setStatus('failed'); return; }
      submissionBusy.current = true;
      setStatus('submitting');
      setError('');
      try {
        await verifyGlobalItems();
        const address = addresses.find(entry => entry.isDefault) || addresses[0] || {};
        const groups = splitGroupsFor(cartItems, checkout.deliveryLines || []).reduce((stores, group) => {
          const storeId = group.line.storeId || group.items[0].storeId || group.items[0].sourceStoreId;
          const existing = stores.find(entry => entry.storeId === storeId);
          if (existing) {
            if ((existing.line.fulfillmentType || 'nearby') !== (group.line.fulfillmentType || 'nearby')
                || (existing.line.selectedDeliveryMethod || existing.line.deliveryType || checkout.method || 'standard') !== (group.line.selectedDeliveryMethod || group.line.deliveryType || checkout.method || 'standard')
                || Number(existing.line.deliveryCharge || 0) !== Number(group.line.deliveryCharge || 0)) {
              throw new Error('Choose one delivery option for each store before checkout.');
            }
            existing.items.push(...group.items);
          } else stores.push({ ...group, storeId, items: [...group.items] });
          return stores;
        }, []);
        const stores = groups.map((group,index) => ({
          ...(() => {
            const quote = group.line.quote || {};
            const isPickup = group.line.deliveryType === 'pickup' || group.line.fulfillmentType === 'pickup';
            return {
              deliveryZoneId: isPickup ? null : quote.deliveryZoneId || null,
              calculatedDistanceKm: isPickup ? null : quote.distanceKm || null,
              routeDistanceMeters: isPickup ? null : quote.routeDistanceMeters || null,
              routeDurationSeconds: isPickup ? null : quote.routeDurationSeconds || null,
              routeDurationMinutes: isPickup ? null : quote.routeDurationMinutes || null,
              matchedZoneLabel: isPickup ? null : quote.matchedZoneLabel || null,
              storeLatitude: quote.storeLatitude ?? null,
              storeLongitude: quote.storeLongitude ?? null,
              estimatedDeliveryMin: isPickup ? null : quote.estimatedDeliveryMin || null,
              estimatedDeliveryMax: isPickup ? null : quote.estimatedDeliveryMax || null,
              freeDeliveryAbove: isPickup ? null : quote.freeDeliveryAbove || null,
              freeDeliveryApplied: !isPickup && Boolean(quote.freeDeliveryApplied),
              scheduledDeliveryDate: group.line.scheduleDate || null,
              scheduledDeliverySlot: group.line.scheduleSlot || null,
              pickupDetails: isPickup ? group.line.pickupDetails || null : null,
            };
          })(),
          customerId,
          storeId: group.storeId,
          items: buildOrderItemsPayload(group.items),
          addresses: buildOrderAddressesPayload({ ...(checkout.selectedAddressSnapshot || address), selectedAddressId: checkout.selectedAddressId }, checkout.deliveryAddress, { name: user.name, phone: checkout.contactNumber || user.phone || user.mobile }),
          deliveryMethod: group.line.fulfillmentType === 'global' ? 'global' : group.line.selectedDeliveryMethod || group.line.deliveryType || checkout.method || 'standard',
          fulfillmentType: group.line.fulfillmentType === 'global' ? 'global' : group.line.deliveryType === 'pickup' || checkout.method === 'pickup' ? 'pickup' : 'nearby',
          deliveryCharge: group.line.deliveryType === 'pickup' || checkout.method === 'pickup' ? 0 : Number(group.line.deliveryCharge ?? (groups.length === 1 ? checkout.deliveryFee : 0) ?? 0),
          customerLatitude: checkout.customerLatitude ?? null,
          customerLongitude: checkout.customerLongitude ?? null,
          couponCode:index===0?(checkout.coupon||''):'',
          promotionLocation:promotionLocationFor(checkout),
        }));
        const group = await persistStoreCheckout({ customerId, stores, cartApi, request: createCheckoutGroup, lookup: getCheckoutGroupByKey, lookupCart: getCheckoutGroupByCart, checkInventory: entries => validateCheckoutAvailability(entries, lookupCheckoutInventory) });
        navigate(`/checkout-group/${encodeURIComponent(group.id)}`);
      } catch (reason) {
        setError(`${resolveError(reason)} Retry checks the existing checkout before submitting again.`);
        setStatus('failed');
      } finally { submissionBusy.current = false; }
      return;
    }
    const validation = validate(retrySaved);
    if (validation) { setError(validation);setStatus('failed');return; }
    submissionBusy.current = true;
    setError('');setStatus('submitting');
    try {
      const paymentMethod = selectedPaymentMethod;
      const isCashOnDelivery = paymentMethod === 'DEMO_COD';
      if (!isCashOnDelivery) {
        await requirePaymentProcessing(getPaymentCapabilities);
      }
      const order = await createOrLoadOrder(retrySaved);
      if (!order.id) throw new Error('Order Service did not return an order ID.');
      const payableAmount = Number(order.totalAmount || order.total || 0);
      if (!(payableAmount > 0)) throw new Error('Order Service did not return a valid order total.');
      const expectedHandlingFee = checkout.fulfillmentType === 'global' || checkout.sourceStoreId === GLOBAL_STORE_ID ? 0 : 5;
      if (!existingOrderId && (Number(order.handlingFee) !== expectedHandlingFee || Math.round(payableAmount * 100) !== Math.round(summary.total * 100))) {
        throw new Error('The server order total differs from checkout. No payment was initiated. Verify the order-service update before retrying.');
      }
      if (isCashOnDelivery) {
        if (!existingOrderId) {
          finishCheckoutCart(customerId, order.storeId);
          if (!retrySaved) clearCartAfterCheckout();
          sessionStorage.removeItem('metaarch.checkoutDraft');
        }
        setResult({ order, payment: { status: 'PENDING', amount: payableAmount, paymentMethod, paymentId: '' } });
        sessionStorage.setItem(COMPLETED_CHECKOUT_RETURN_KEY, order.id);
        setStatus('succeeded');
        return;
      }
      const createdPayment = await createOrLoadPayment(order, paymentMethod, payableAmount);
      if (!createdPayment.paymentId) throw new Error('Payment Service did not return a payment ID.');
      setPayment(createdPayment);
      setStatus('pending');

      const processedPayment = createdPayment;
      setPayment(processedPayment);
      const [statusResult, paymentResult, orderPaymentResult] = await Promise.allSettled([
        getPaymentStatus(createdPayment.paymentId),
        getPayment(createdPayment.paymentId),
        getPaymentByOrder(order.id),
      ]);
      const statusPayload = statusResult.status === 'fulfilled' ? statusResult.value : null;
      const confirmedStatus = (typeof statusPayload === 'string' ? statusPayload : statusPayload?.status) || processedPayment.status;
      const confirmedPayment = normalizePayment({
        ...processedPayment,
        ...(paymentResult.status === 'fulfilled' ? paymentResult.value : {}),
      });
      const orderPayment = orderPaymentResult.status === 'fulfilled' ? normalizePayment(orderPaymentResult.value) : null;
      const latestPayment = {
        ...(orderPayment?.paymentId ? orderPayment : confirmedPayment),
        paymentMethod,
      };
      setPayment(latestPayment);

      if (confirmedStatus === 'SUCCESS' && latestPayment.status === 'SUCCESS') {
        const paidOrder = normalizeOrder(await getOrder(order.id));
        if (!isPaidOrderStatus(paidOrder.paymentStatus)) {
          setStatus('pending');
          return;
        }
        if (!existingOrderId) {
          finishCheckoutCart(customerId, order.storeId);
          clearCartAfterCheckout();
        }
        sessionStorage.removeItem('metaarch.checkoutDraft');
        setResult({ order: paidOrder, payment: latestPayment });
        sessionStorage.setItem(COMPLETED_CHECKOUT_RETURN_KEY, order.id);
        setStatus('succeeded');
        return;
      }
      if (latestPayment.status === 'REFUNDED') { setStatus('refunded');return; }
      if (latestPayment.status === 'FAILED') { setStatus('failed');setError(paymentStatusText.FAILED);return; }
      setStatus('pending');
    } catch (reason) {
      setError(resolveError(reason));
      setStatus('failed');
    } finally { submissionBusy.current = false; }
  };

  const activePaymentStatus = payment?.status || (status === 'pending' ? 'PENDING' : status === 'refunded' ? 'REFUNDED' : status === 'failed' && payment?.paymentId ? 'FAILED' : '');

  if (status !== 'succeeded' && sessionStorage.getItem(COMPLETED_CHECKOUT_RETURN_KEY)) return <Box className="payment-shell" role="status">Returning to your cartâ€¦</Box>;

  if (status === 'succeeded' && result) return <Box className="payment-shell"><Box className="payment-result"><Box className="success-ring"><CheckCircleOutlinedIcon/></Box><Typography variant="h4">{result.payment.status === 'PENDING' ? 'Order Placed' : 'Payment Successful'}</Typography><Typography color="text.secondary">{result.payment.status === 'PENDING' ? 'Cash on delivery will be collected when the order arrives.' : 'Payment Service confirmed this payment.'}</Typography><Box className="result-amount"><span>Amount</span><strong>{formatCurrency(result.payment.amount)}</strong></Box><Box className="result-refs"><span>Order ID<strong>{result.order.id}</strong></span><span>Payment ID<strong>{result.payment.paymentId || 'Pending'}</strong></span></Box>{result.order.childOrders?.length>0&&<Box className="summary-content">{result.order.childOrders.map((order)=><Box className="summary-product store-tracking-row" key={order.id}><span>{storeNameFor(order)}<small>{order.id} | {order.deliveryLabel || order.estimatedDelivery || 'Tracking available'}</small></span><strong>{formatCurrency(order.totalAmount || order.total)}</strong><Button size="small" variant="outlined" onClick={()=>navigate(`/order-details/${encodeURIComponent(order.id)}`,{state:{orderId:order.id,paymentId:result.payment.paymentId}})}>Track</Button></Box>)}</Box>}<Box className="result-refs"><span>Payment Status<strong>{result.payment.status}</strong></span><span>Method<strong>{displayPaymentMethod(result.payment.paymentMethod)}</strong></span></Box><Box className="result-actions"><Button variant="contained" onClick={()=>result.order.childOrders?.length?navigate('/orders'):navigate(`/order-details/${encodeURIComponent(result.order.id)}`,{state:{orderId:result.order.id,paymentId:result.payment.paymentId}})}>{result.order.childOrders?.length?'View All Orders':'View Order Details & Tracking'}</Button><Button variant="outlined" onClick={()=>navigate('/home')}>Continue Shopping</Button><Button variant="outlined" onClick={()=>navigate('/cart',{replace:true})}>Back to Cart</Button></Box></Box></Box>;

  const paymentAddress = checkout.deliveryAddress || existingOrder?.addresses?.find((address) => address.addressType === 'SHIPPING')?.addressLine1 || existingOrder?.addresses?.[0]?.addressLine1 || '';
  const activeMethod = selectableMethods.find((item) => item.id === selectedMethod) || methods.find((item) => item.id === 'cod');

  return <Box className="payment-shell">
    <header className="payment-header">
      <Box className="payment-header-left">
        <Button aria-label="Back" onClick={() => navigate('/checkout', { state: { checkout } })}><ArrowBackIcon /></Button>
        <span className="payment-header-lock"><LockOutlinedIcon /></span>
        <Box><strong>Secure Checkout</strong><small>Your information is safe and secure</small></Box>
      </Box>
      <Box className="payment-header-security"><VerifiedUserOutlinedIcon /><Box><strong>Secure Payment</strong><small>256-bit SSL Encrypted</small></Box></Box>
    </header>
    <main className="payment-layout">
      <section className={`order-summary-panel ${summaryOpen ? 'open' : ''}`}>
        <button type="button" className="summary-toggle" onClick={() => setSummaryOpen((value) => !value)}>
          <span className="summary-cart-icon"><ShoppingCartOutlinedIcon /></span>
          <span className="summary-toggle-copy"><strong>Order Summary</strong><small>{existingOrder ? 'Backend order total' : `${cartItems.length} ${cartItems.length === 1 ? 'item' : 'items'}`}</small></span>
          <strong className="summary-toggle-total">{formatCurrency(summary.total)}</strong><KeyboardArrowDownIcon />
        </button>
        <Collapse in={summaryOpen}>
          <Box className="summary-content">
            {cartItems.map((item) => {
              const product = catalogProducts.find((entry) => String(entry.productId || entry.id) === String(item.productId || item.id)) || {};
              const productImage = item.image || item.imageUrl || product.image || product.images?.[0] || product.gallery?.[0] || '';
              return <Box className="summary-product" key={cartItemKey(item)}>
                <SafeProductImage src={productImage} alt={item.title || product.title || 'Product'} />
                <span><strong>{item.title || product.title}</strong><small>{item.sku || product.sku || item.productId || item.id || ''}</small><small>x {item.quantity}</small></span>
                <strong>{formatCurrency(Number(item.price || item.unitPrice) * Number(item.quantity))}</strong>
              </Box>;
            })}
            {existingOrder && cartItems.length === 0 && <Box className="summary-product"><span><strong>Order {existingOrder.id}</strong><small>Payment retry</small></span><strong>{formatCurrency(existingOrder.totalAmount)}</strong></Box>}
            <Box className="summary-totals">
              <span><i><Inventory2OutlinedIcon />Subtotal</i><strong>{formatCurrency(summary.subtotal)}</strong></span>
              <span><i><LocalShippingOutlinedIcon />Delivery</i><strong>{formatCurrency(summary.delivery)}</strong></span>
              <span><i><Inventory2OutlinedIcon />Handling</i><strong>{formatCurrency(summary.handling)}</strong></span>
              {summary.discount > 0 && <span className="summary-discount"><i>Discount</i><strong>-{formatCurrency(summary.discount)}</strong></span>}
              <span className="summary-grand"><i><PaymentsOutlinedIcon />Total Amount</i><strong>{formatCurrency(summary.total)}</strong></span>
            </Box>
            {paymentAddress && <Box className="summary-address"><span className="summary-address-icon"><PlaceOutlinedIcon /></span><Box><strong>Deliver to</strong><span>{paymentAddress}</span></Box><button type="button" onClick={() => navigate('/checkout', { state: { checkout } })}><EditOutlinedIcon />Change</button></Box>}
          </Box>
        </Collapse>
      </section>
      <section className="payment-method-panel">
        <Box className="payment-title"><span className="payment-title-icon"><CreditCardIcon /></span><Box><Typography variant="h5">Payment Method</Typography><Typography>Choose a payment option to place the order</Typography></Box><Box className="payment-hero-illustration"><span><CreditCardIcon /></span><VerifiedUserOutlinedIcon /></Box></Box>
        <Box className="method-workspace">
          <nav className="method-tabs" aria-label="Payment methods">{selectableMethods.map((item) => <button type="button" key={item.id} className={method === item.id ? 'active' : ''} onClick={() => { setMethod(item.id); setStatus('selecting'); setError(''); }}>{item.icon}<span>{item.label}</span></button>)}</nav>
          <Box className="method-detail">
            <Box className="method-form">
              <Typography variant="h6">{activeMethod.id === 'cod' ? 'COD Payment' : `${activeMethod.displayMethod} Payment`}</Typography>
              <Typography color="text.secondary">Select your preferred payment method to place the order.</Typography>
              <Box className="option-list"><button type="button" className="selected" onClick={() => setMethod(activeMethod.id)}><span className="option-mark">{activeMethod.icon}</span><span><strong>{activeMethod.displayMethod === 'Cash on Delivery' ? 'Cash on Delivery' : activeMethod.displayMethod}</strong><small>{activeMethod.id === 'cod' ? 'Pay when the order arrives at your doorstep.' : activeMethod.caption}</small></span><i>●</i></button></Box>
              <Box className="payment-assurances">
                <Box><SecurityOutlinedIcon /><span><strong>{activeMethod.id === 'cod' ? 'No Online Payment' : 'Secure Payment'}</strong><small>{activeMethod.id === 'cod' ? 'Pay in cash' : 'Encrypted checkout'}</small></span></Box>
                <Box><VerifiedUserOutlinedIcon /><span><strong>Safe &amp; Secure</strong><small>Verified delivery</small></span></Box>
                <Box><AutorenewOutlinedIcon /><span><strong>Easy Returns</strong><small>Hassle free</small></span></Box>
              </Box>
              {activePaymentStatus && <Box className="payment-state-note" role="status"><strong>{activePaymentStatus}</strong><span>{paymentStatusText[activePaymentStatus] || 'Payment status received from Payment Service.'}</span>{payment?.paymentId && <span>Payment ID: {payment.paymentId}</span>}</Box>}
              {checkoutBlock ? <Box className="payment-state-note" role="status"><strong>Checkout unavailable for this cart</strong><span>{checkoutBlock}</span><span>No payment was attempted.</span><Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/cart')}>Edit Cart</Button></Box>
                : status === 'failed' && <Box className="payment-error" role="alert"><ErrorOutlinedIcon /><Box><strong>{payment?.paymentId ? 'Payment Failed' : 'Checkout Could Not Proceed'}</strong><span>{error || 'Please try again in a moment.'}</span>{!multiStoreCart && /previous cart is claimed by checkout|earlier checkout has an unresolved result|retry that checkout/i.test(error) && <span>Retry Saved Checkout resubmits the original saved order. The different item currently shown will not be submitted by that action.</span>}</Box>{!multiStoreCart && /previous cart is claimed by checkout|earlier checkout has an unresolved result|retry that checkout/i.test(error) ? <Button onClick={() => pay(true)}>Retry Saved Checkout</Button> : <Button onClick={() => { setStatus('selecting'); setError(''); }}>Try Again</Button>}</Box>}
              <Button className="payment-button" variant="contained" disabled={status === 'submitting' || Boolean(checkoutBlock)} onClick={() => pay()}>{status === 'submitting' ? <><CircularProgress size={19} color="inherit" />{persistedMultiStore && multiStoreCart ? 'Saving Checkout...' : 'Placing Order...'}</> : `Place Order ${formatCurrency(summary.total)}`}<ChevronRightIcon /></Button>
              <Typography className="payment-cash-note">{activeMethod.id === 'cod' ? `You'll pay ${formatCurrency(summary.total)} in cash when your order is delivered.` : 'Your payment is protected by secure encryption.'}</Typography>
            </Box>
          </Box>
        </Box>
      </section>
    </main>
  </Box>;};

export default PaymentOptions;
