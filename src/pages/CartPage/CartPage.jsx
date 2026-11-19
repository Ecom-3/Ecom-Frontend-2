import { useContext, useEffect, useState } from 'react';
import { Alert, Box, Typography, Button, IconButton, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import ProductCard from '../../components/ProductCard/ProductCard';
import { AppContext } from '../../context/AppContext';
import pickleJarImg from '../../assets/images/pickel-removebg-preview.png';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage';
import { useNavigate } from 'react-router-dom';
import './CartPage.css';
import { hasCompleteProfile } from '../../utils/profileCompletion';
import { buildCartDeliveryLines } from '../../services/cartDeliveryLines';
import { peekPendingCouponCode, calculateCouponDiscount, cartPromotionContext, validateCouponCode } from '../../services/couponService';
import { isGlobalProduct } from '../../utils/storeDelivery';

const COMPLETED_CHECKOUT_RETURN_KEY = 'freshcart.completedCheckoutReturnToCart';

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart, saveItemForLater, savedForLater, restoreSavedItem, removeSavedForLater, formatCurrency, cartTotal, cartLoading, cartError, cartUnavailable, isLoggedIn, user, addresses, catalogProducts, catalogItemKey, deliveryMode, setDeliveryMode, selectedLocation } = useContext(AppContext);
  const [deliveryLines, setDeliveryLines] = useState([]);
  const [deliveryError, setDeliveryError] = useState('');
  const [offerCode] = useState(() => peekPendingCouponCode());
  const [couponResult, setCouponResult] = useState(null);
  const goToCheckout = () => {
    sessionStorage.removeItem(COMPLETED_CHECKOUT_RETURN_KEY);
    if (undeliverableStoreGroups.length) return;
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/checkout', completeProfile: true, checkoutIntent: true } });
      return;
    }
    if (!hasCompleteProfile(user, [{}])) {
      navigate('/profile', { state: { completeProfile: true, returnTo: '/checkout' } });
      return;
    }
    navigate(addresses.length ? '/checkout' : '/address-form', { state: { returnTo: '/checkout', location: selectedLocation } });
  };

  const grandTotal = cartTotal;
  const hasGlobalCart = cartItems.some((item) => isGlobalProduct(item)
    || item.storeId === 'global-store'
    || item.sourceStoreId === 'global-store');
  const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0] || {};
  const customerLat = Number(selectedLocation?.latitude ?? defaultAddress.coordinates?.lat ?? defaultAddress.latitude);
  const customerLng = Number(selectedLocation?.longitude ?? defaultAddress.coordinates?.lng ?? defaultAddress.longitude);
  useEffect(() => {
    let ignore = false;
    if (!cartItems.length || deliveryMode === 'pickup') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeliveryLines([]);
      return undefined;
    }
    buildCartDeliveryLines({ cartItems, catalogProducts, latitude: customerLat, longitude: customerLng, defaultMethod: 'instant' })
      .then((lines) => { if (!ignore) { setDeliveryLines(lines); setDeliveryError(''); } })
      .catch((reason) => { if (!ignore) setDeliveryError(reason.message || 'Store delivery details could not be loaded.'); });
    return () => { ignore = true; };
  }, [customerLat, customerLng, cartItems, catalogProducts, deliveryMode]);
  useEffect(() => {
    if (hasGlobalCart && deliveryMode === 'pickup') {
      setDeliveryMode('delivery');
    }
  }, [hasGlobalCart, deliveryMode, setDeliveryMode]);
  const deliveryCharge = 0;
  const couponContext = cartPromotionContext({ cartItems, catalogProducts });
  const couponKey = JSON.stringify([offerCode, grandTotal, couponContext.location, couponContext.store]);
  useEffect(() => {
    let ignore=false;
    if(!offerCode)return undefined;
    validateCouponCode(offerCode,{subtotal:grandTotal,location:couponContext.location,store:couponContext.store}).then((result)=>{if(!ignore)setCouponResult({key:couponKey,result});});
    return()=>{ignore=true;};
  },[offerCode,grandTotal,couponContext.location,couponContext.store,couponKey]);
  const currentCouponResult = couponResult?.key === couponKey ? couponResult.result : null;
  const offerDiscount = currentCouponResult?.valid ? calculateCouponDiscount(currentCouponResult.coupon, grandTotal) : 0;
  const cartTotalWithDelivery = grandTotal + deliveryCharge - offerDiscount;
  const offerMessage = offerCode ? (currentCouponResult?.valid ? `${offerCode} applied. You saved ${formatCurrency(offerDiscount)}.` : currentCouponResult?.message || 'Offer could not be applied.') : '';
  const itemLineKey = (item) => `${item.storeId || item.sourceStoreId || item.store || item.storeName || 'store'}:${item.productId || item.id || ''}:${item.variantId ?? 'product'}`;
  const lineFor = (item) =>
    deliveryLines.find((line) => line.key === itemLineKey(item))
    || deliveryLines.find((line) => line.storeId && [item.storeId, item.sourceStoreId].includes(line.storeId) && line.productId === item.productId && (line.variantId ?? null) === (item.variantId ?? null))
    || {};
  const deliveryGroups = cartItems.reduce((groups, item) => {
    const line = lineFor(item);
    const key = `${line.fulfillmentType || item.fulfillmentType || 'checking'}:${item.storeId || item.sourceStoreId || line.storeId || item.store || item.storeName || 'store'}:${line.deliveryType || item.deliveryType || 'delivery'}`;
    const existing = groups.find((group) => group.key === key);
    const group = existing || { key, line, items: [] };
    group.items.push(item);
    if (!existing) groups.push(group);
    return groups;
  }, []);
  const undeliverableStoreGroups = deliveryMode === 'delivery'
    ? deliveryGroups.filter((group) => group.line.fulfillmentType !== 'global' && group.line.quote?.deliveryAvailable === false)
    : [];
  const checkoutBlockedByDelivery = undeliverableStoreGroups.length > 0;

  const youMayAlsoLike = catalogProducts.filter((product) => !cartItems.some((item) => item.productId === product.productId)).slice(0, 3);
  const storeLabelFor = (item) => item.storeId === 'global-store' || item.sourceStoreId === 'global-store'
    ? 'India-wide Global Store'
    : item.storeName || item.store || item.sourceStore || item.sourceStoreName || item.storeId || item.sourceStoreId || 'Store';
  const savedForLaterGroups = savedForLater.reduce((groups, item) => {
    const storeName = storeLabelFor(item);
    const group = groups.find((entry) => entry.storeName === storeName) || { storeName, items: [] };
    group.items.push(item);
    if (!groups.includes(group)) groups.push(group);
    return groups;
  }, []);
  const savedForLaterSection = savedForLaterGroups.length > 0 && (
    <Box className="saved-later-section">
      <Typography className="section-title-bold">Saved for Later</Typography>
      {savedForLaterGroups.map((group) => (
        <Box className="saved-store-card" key={group.storeName}>
          <Box className="saved-store-header">
            <Typography className="saved-store-title">{group.storeName}</Typography>
            <Typography className="saved-store-count">{group.items.length} item{group.items.length === 1 ? '' : 's'}</Typography>
          </Box>
          {group.items.map((item) => (
            <Box key={catalogItemKey(item)} className="saved-item-row">
              <Box className="saved-item-main">
                <Box className="slot-item-img saved-item-img">
                  <SafeProductImage src={item.image} fallback={pickleJarImg} alt={item.title} />
                </Box>
                <Box className="saved-item-info">
                  <Typography className="slot-item-title">{item.title}</Typography>
                  <Typography className="slot-item-weight">{item.weight} &bull; Qty {item.quantity || 1}</Typography>
                  <Typography className="slot-item-price">{formatCurrency(item.price || item.unitPrice || 0)}</Typography>
                  <Box className="saved-item-actions">
                    <Button size="small" onClick={() => restoreSavedItem(item)} disabled={cartLoading} sx={{ p: 0, minWidth: 0, textTransform: 'none' }}>Move to Cart</Button>
                    <Button size="small" color="error" onClick={() => removeSavedForLater(item)} disabled={cartLoading} sx={{ p: 0, minWidth: 0, textTransform: 'none' }}>Remove</Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box className="cart-page-wrapper">
      {/* Header Bar matching screenshot */}
      <Box className="cart-page-header">
        <Box className="cart-breadcrumb"><button type="button" onClick={() => navigate('/home')}>Home</button><span>›</span><strong>Cart</strong></Box>
        <Box className="cart-checkout-progress" aria-label="Checkout progress">
          <Box className="cart-progress-step active"><span>1</span><b>Cart</b></Box><i />
          <Box className="cart-progress-step"><span>2</span><b>Checkout</b></Box><i />
          <Box className="cart-progress-step"><span>3</span><b>Payment</b></Box><i />
          <Box className="cart-progress-step"><span>4</span><b>Confirmation</b></Box>
        </Box>
        <Box className="cart-header-actions">
          <Box sx={{ display:'flex', gap:1 }}><Button size="small" variant={deliveryMode === 'delivery' ? 'contained' : 'outlined'} onClick={() => setDeliveryMode('delivery')}>Delivery</Button>{!hasGlobalCart && <Button size="small" variant={deliveryMode === 'pickup' ? 'contained' : 'outlined'} onClick={() => setDeliveryMode('pickup')}>Pick-up</Button>}</Box>
          <IconButton onClick={() => navigate('/search')} aria-label="Search products"><SearchIcon /></IconButton>
        </Box>
      </Box>

      {/* Main Scroll Content */}
      <Box className="cart-page-scroll">
        {cartLoading && <Typography role="status" sx={{ p: 2 }}>Updating cart...</Typography>}
        {cartError && <Typography role="alert" color={cartUnavailable ? 'error' : 'text.secondary'} sx={{ p: 2 }}>{cartError}</Typography>}
        {cartItems.length === 0 ? (
          <>
            <Box className="empty-cart-page">
              <Typography variant="h6" color="textSecondary">
                Your cart is empty
              </Typography>
              <Button
                variant="contained"
                className="shop-now-btn"
                onClick={() => navigate('/home')}
              >
                Shop Now
              </Button>
            </Box>
            {savedForLaterSection}
          </>
        ) : (
          <Box className="cart-items-container">
          <Box className="cart-content-grid">
          <Box className="cart-primary-column">
            <Box className="cart-list-toolbar" sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Typography variant="h6">Your items ({cartItems.length})</Typography>
              <Button color="error" onClick={clearCart} disabled={cartLoading}>Clear cart</Button>
              {deliveryError && <Typography role="alert" color="error">{deliveryError}</Typography>}
            </Box>
            {deliveryGroups.map((group) => (
              <Box key={group.key} className="cart-slot-card">
                <Box className="slot-banner">
                  <StorefrontOutlinedIcon className="slot-store-icon" />
                  <span className="slot-text">
                    {deliveryMode === 'pickup' ? `Pick-up | ${group.line.storeName || group.items[0]?.storeName || group.items[0]?.store || 'Store'} | ${group.items.length} item${group.items.length === 1 ? '' : 's'}` : group.line.fulfillmentType === 'global' ? `Global Delivery | Delivered in 7-10 days | ${group.items.length} Item${group.items.length === 1 ? '' : 's'}` : group.line.quote?.deliveryAvailable === false ? `Delivery unavailable | ${group.line.storeName || 'Store'} | ${group.items.length} item${group.items.length === 1 ? '' : 's'}` : `${group.line.deliveryLabel || 'Calculating delivery'} | ${group.line.storeName || 'Store checking'} | ${group.items.length} item${group.items.length === 1 ? '' : 's'}`}
                  </span>
                  <Chip className="verified-store-chip" size="small" label={`${group.items.length} item${group.items.length === 1 ? '' : 's'}`} />
                </Box>

                {deliveryMode === 'delivery' && group.line.fulfillmentType !== 'global' && group.line.quote?.deliveryAvailable === false && <Alert severity="warning" sx={{ mx: 2, mb: 1 }}>
                  This store is outside the deliverable area for your selected location. Change your delivery location or remove these items to continue. Pick-up may be available.
                </Alert>}

                {group.items.map((item) => <Box className="slot-item-body" key={catalogItemKey(item)}>
                    <Box className="slot-item-img">
                      <SafeProductImage src={item.image} fallback={pickleJarImg} alt={item.title} />
                    </Box>
                    <Box className="slot-item-info">
                      <Typography component="button" className="slot-item-title" onClick={() => navigate(`/product-info/${encodeURIComponent(item.productId || item.id)}`)} sx={{ border:0, bgcolor:'transparent', textAlign:'left', cursor:'pointer' }}>{item.title}</Typography>
                      <Typography className="slot-item-weight">{item.weight}</Typography>
                      <Typography className="slot-item-store">{storeLabelFor(item)}</Typography>
                      <Typography className="slot-item-weight">{deliveryMode === 'pickup' ? 'Pick-up from store' : lineFor(item).fulfillmentType === 'global' ? 'Delivered in 7-10 days' : lineFor(item).quote?.deliveryAvailable === false ? 'Outside this store’s delivery area' : lineFor(item).estimatedDelivery || 'Checking ETA'}</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}><Button size="small" disabled={cartLoading} onClick={() => saveItemForLater(item)} sx={{ p: 0, minWidth: 0, textTransform: 'none' }}>Save for later</Button><Button size="small" disabled={cartLoading} color="error" onClick={() => removeFromCart(item.productId, item.variantId, item.storeId)} sx={{ p: 0, minWidth: 0, textTransform: 'none' }}>Remove</Button></Box>
                      <Typography className="slot-item-price">{formatCurrency(Number(item.price) * Number(item.quantity))}</Typography>
                    </Box>

                    <Box className="slot-qty-selector">
                      <button
                        className="slot-qty-btn"
                        disabled={cartLoading}
                        onClick={() => updateQuantity(item.productId, item.variantId, -1, item.storeId)}
                      >
                        -
                      </button>
                      <span className="slot-qty-count">{item.quantity}</span>
                      <button
                        className="slot-qty-btn"
                        disabled={cartLoading}
                        onClick={() => updateQuantity(item.productId, item.variantId, 1, item.storeId)}
                      >
                        +
                      </button>
                    </Box>
                  </Box>)}
              </Box>
            ))}

            {savedForLaterSection}

            {deliveryMode !== 'pickup' && deliveryLines.length > 0 && <Box className="cart-bill-summary-card cart-delivery-breakdown">
              <Box className="bill-divider-header">
                <Typography className="bill-section-title">Item Delivery Breakdown</Typography>
                <Box className="bill-title-line" />
              </Box>
              {deliveryGroups.map((group, index) => <Box className="bill-data-row" key={group.key}><Typography className="bill-item-label">Order {index + 1}: {group.line.fulfillmentType === 'global' ? 'Global Fulfillment' : group.line.storeName || 'Store not mapped'} | {group.items.length} Item{group.items.length === 1 ? '' : 's'}</Typography><Typography className="bill-item-value">{group.line.fulfillmentType === 'global' ? '7-10 days delivery' : group.line.quote?.deliveryAvailable === false ? 'Outside delivery area' : group.line.deliveryLabel}</Typography></Box>)}
            </Box>}

            {/* You May Also Like Section */}
            <Box className="you-may-like-section">
              <Typography className="section-title-bold">You May Also Like</Typography>
              <Box className="like-items-row">
                {youMayAlsoLike.map((prod, i) => (
                  <ProductCard key={prod.productId || i} {...prod} />
                ))}
              </Box>
            </Box>

          </Box>
          <Box className="cart-summary-column">
            <Box className="cart-bill-summary-card cart-order-summary">
              <Box className="bill-divider-header">
                <Typography className="bill-section-title">Order Summary</Typography>
                <Box className="bill-title-line" />
              </Box>

              <Box className="bill-data-row">
                <Typography className="bill-item-label">Items ({cartItems.length})</Typography>
                <Typography className="bill-item-value">{formatCurrency(grandTotal)}</Typography>
              </Box>
              <Box className="bill-data-row"><Typography className="bill-item-label">Delivery fee</Typography><Typography className="bill-item-free">Calculated at checkout</Typography></Box>

              {offerCode && <Box className="bill-data-row">
                <Typography className="bill-item-label">Offer {offerCode}</Typography>
                <Typography className={currentCouponResult?.valid ? 'bill-item-free' : 'bill-item-value'}>{currentCouponResult?.valid ? `-${formatCurrency(offerDiscount)}` : 'Not applied'}</Typography>
              </Box>}
              {offerMessage && <Typography role="status" sx={{ color: currentCouponResult?.valid ? '#075F40' : 'error.main', fontSize: 13 }}>{offerMessage}</Typography>}

              <Box className="grand-total-row">
                <Typography className="grand-total-label">Amount to be paid</Typography>
                <Typography className="grand-total-value">{formatCurrency(cartTotalWithDelivery)}</Typography>
              </Box>
              <Button variant="contained" className="summary-checkout-button" onClick={goToCheckout} disabled={cartLoading || checkoutBlockedByDelivery}>Proceed to Checkout <span>→</span></Button>
            </Box>
            <Box className="cart-benefits-card">
              <Box><StorefrontOutlinedIcon /><span><strong>Multiple Stores</strong><small>Items from each store are grouped separately.</small></span></Box>
              <Box><LocalShippingOutlinedIcon /><span><strong>Store Delivery</strong><small>Delivery options are confirmed at checkout.</small></span></Box>
              <Box><CheckCircleOutlineIcon /><span><strong>Quality Products</strong><small>Carefully selected for your order.</small></span></Box>
              <Box><SupportAgentOutlinedIcon /><span><strong>Need Help?</strong><small>Contact support for assistance.</small></span></Box>
            </Box>
          </Box>
          </Box>
          </Box>
        )}
      </Box>

      {/* Sticky Bottom Delivery Address & Action Footer */}
      {cartItems.length > 0 && (
        <Box className="cart-sticky-footer">
          <Box className="checkout-action-row">
            <Box className="total-pay-col">
              <Typography className="footer-item-count">{cartItems.length} items <span>·</span> Amount to be paid</Typography>
              <Typography className="total-pay-amount">{formatCurrency(cartTotalWithDelivery)}</Typography>
            </Box>

            <Button
              variant="contained"
              className="proceed-pay-btn"
              onClick={goToCheckout}
              disabled={cartLoading || checkoutBlockedByDelivery}
            >
              Proceed to Checkout <span>→</span>
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CartPage;

