import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, MenuItem, Rating, Select, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header/Header';
import BottomNav from '../../components/BottomNav/BottomNav';
import { getOrder, getOrderReviews, normalizeOrder, saveOrderReview } from '../../services/orderApi';
import { getFulfillmentByOrderId, getShipmentByOrderId, normalizeFulfillment, normalizeShipment } from '../../services/fulfillmentApi';
import { reviewEligible } from '../../utils/reviewEligibility.js';
import { isValidImageUrl, normalizeImageUrl } from '../../utils/imageUrl.js';

const MAX_PHOTOS = 3;
export default function OrderReviewPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [productId, setProductId] = useState('');
  const [savedReviews, setSavedReviews] = useState([]);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [deliveryComplete, setDeliveryComplete] = useState(false);
  const submissionBusy = useRef(false);

  useEffect(() => {
    let active = true;
    const optional = (request) => request.catch((requestError) => {
      if (requestError?.status === 404) return null;
      throw requestError;
    });
    Promise.resolve().then(() => {
      if (active) { setRating(0); setComment(''); setPhotos([]); setSavedReviews([]); setSubmitted(false); setProductId(''); }
      return Promise.all([getOrder(orderId), optional(getOrderReviews(orderId)), optional(getFulfillmentByOrderId(orderId)), optional(getShipmentByOrderId(orderId))]);
    })
      .then(([savedOrder, reviews, savedFulfillment, savedShipment]) => {
        if (!active) return;
        const fulfillment = normalizeFulfillment(savedFulfillment || {});
        const shipment = normalizeShipment(savedShipment || {});
        const complete = ['DELIVERED', 'Delivered'].includes(fulfillment.status) || ['DELIVERED', 'Delivered'].includes(shipment.status);
        setDeliveryComplete(complete);
        setOrder({ ...normalizeOrder(savedOrder), status: complete ? 'DELIVERED' : normalizeOrder(savedOrder).status });
        const orderItems = normalizeOrder(savedOrder).items;
        const existingReviews = Array.isArray(reviews) ? reviews : [];
        const firstItem = orderItems.find((item) => !existingReviews.some((review) => review.productId === item.productId)) || orderItems[0];
        const currentReview = existingReviews.find((review) => review.productId === firstItem?.productId);
        setSavedReviews(existingReviews);
        setProductId(currentReview?.productId || firstItem?.productId || '');
        if (currentReview) {
          setRating(Number(currentReview.rating) || 0);
          setComment(currentReview.comment || '');
          setPhotos(Array.isArray(currentReview.photoUrls) ? currentReview.photoUrls : []);
          setSubmitted(true);
        }
      })
      .catch((requestError) => active && setError(requestError.message || 'Unable to load this order.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [orderId]);

  const addPhotoUrl = () => {
    const normalized = normalizeImageUrl(photoUrl);
    if (!normalized || !isValidImageUrl(normalized)) return setError('Enter a valid image URL. Google Drive images must be shared with anyone who has the link.');
    if (photos.length >= MAX_PHOTOS) return setError(`You can add up to ${MAX_PHOTOS} photos.`);
    setPhotos((current) => current.includes(normalized) ? current : [...current, normalized]);
    setPhotoUrl('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submissionBusy.current) return;
    if (!reviewEligible(order)) return setError('A review can be submitted after delivery is complete.');
    if (!rating) return setError('Please select a star rating.');
    submissionBusy.current = true;
    setSaving(true); setError('');
    try {
      const saved = await saveOrderReview(orderId, { productId: productId || null, rating, comment: comment.trim(), photoUrls: photos });
      setSavedReviews((current) => [...current.filter((review) => review.productId !== saved.productId), saved]);
      setSubmitted(true);
    } catch (requestError) { setError(requestError.message || 'Your review could not be saved.'); }
    finally { submissionBusy.current = false; setSaving(false); }
  };

  const page = (content) => <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: '#f6f8f7' }}><Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}><Header /><Box component="main" sx={{ maxWidth: 620, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>{content}</Box></Box><Box sx={{ flexShrink: 0 }}><BottomNav /></Box></Box>;
  if (loading) return page(<Box sx={{ textAlign: 'center', pt: 8 }}><CircularProgress /><Typography sx={{ mt: 2 }}>Loading order...</Typography></Box>);
  if (error && !order) return page(<><Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')}>Orders</Button><Alert severity="error" sx={{ mt: 2 }}>{error}</Alert></>);
  if (order?.status !== 'DELIVERED' && !deliveryComplete) return page(<><Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/order-details/${orderId}`)}>Back to order</Button><Box sx={{ mt: 5, textAlign: 'center' }}><Typography variant="h5" fontWeight={700}>Review available after delivery</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>You can rate this order when its delivery is complete.</Typography></Box></>);
  const selectedItem = order?.items?.find((item) => item.productId === productId) || order?.items?.[0];
  const nextReviewItem = order?.items?.find((item) => !savedReviews.some((review) => review.productId === item.productId));
  const selectProduct = (nextProductId) => {
    const existing = savedReviews.find((review) => review.productId === nextProductId);
    setProductId(nextProductId); setRating(Number(existing?.rating) || 0); setComment(existing?.comment || '');
    setPhotos(Array.isArray(existing?.photoUrls) ? existing.photoUrls : []); setSubmitted(Boolean(existing)); setError('');
  };
  if (submitted) return page(<><Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/order-details/${orderId}`)}>Back to order</Button><Box sx={{ bgcolor: '#fff', mt: 3, p: { xs: 3, sm: 5 }, textAlign: 'center', border: '1px solid #dde6e1', borderRadius: 2 }}><CheckCircleOutlineIcon sx={{ fontSize: 54, color: '#087f5b' }} /><Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>Thanks for sharing</Typography><Typography color="text.secondary" sx={{ mt: 1.5 }}>Your review for {selectedItem?.title || 'this product'} has been saved for moderation.</Typography><Rating value={rating} readOnly sx={{ mt: 2 }} />{order?.items?.length > 1 && <Select fullWidth value={productId} onChange={(event) => selectProduct(event.target.value)} sx={{ mt: 2 }} aria-label="Select product review">{order.items.map((item) => <MenuItem key={item.productId || item.id} value={item.productId}>{item.title} · {savedReviews.some((review) => review.productId === item.productId) ? 'Review saved' : 'Not reviewed'}</MenuItem>)}</Select>}<Box sx={{ mt: 3 }}><Button variant="outlined" onClick={() => setSubmitted(false)}>Edit review</Button>{nextReviewItem && nextReviewItem.productId !== productId && <Button sx={{ ml: 1 }} variant="contained" onClick={() => selectProduct(nextReviewItem.productId)}>Review next product</Button>}<Button sx={{ ml: 1 }} onClick={() => navigate('/orders')}>View orders</Button></Box></Box></>);

  return page(<><Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/order-details/${orderId}`)}>Back to order</Button><Box component="form" onSubmit={submit} sx={{ mt: 2, bgcolor: '#fff', border: '1px solid #dde6e1', borderRadius: 2, overflow: 'hidden' }}><Box sx={{ p: { xs: 2.5, sm: 4 }, textAlign: 'center' }}><Typography variant="h5" fontWeight={800}>Rate a product from this order</Typography>{order.items?.length > 1 ? <Select fullWidth value={productId} onChange={(event) => selectProduct(event.target.value)} sx={{ mt: 2 }} inputProps={{ 'aria-label': 'Product to review' }}>{order.items.map((item) => <MenuItem key={item.productId || item.id} value={item.productId}>{item.title} · {item.quantity} purchased</MenuItem>)}</Select> : <Typography color="text.secondary" sx={{ mt: 1 }}>{order.items?.[0]?.title || 'Your delivered order'}</Typography>}<Rating name="order-rating" value={rating} onChange={(_, value) => { setRating(value || 0); setError(''); }} size="large" sx={{ mt: 2 }} /><Typography variant="body2" color="text.secondary">{rating ? `${rating} out of 5` : 'Tap a star to rate'}</Typography></Box><Box sx={{ borderTop: '1px solid #e5e7eb', p: { xs: 2.5, sm: 4 } }}><TextField fullWidth multiline minRows={4} label="Tell us about your experience" value={comment} inputProps={{ maxLength: 1000 }} onChange={(event) => setComment(event.target.value)} helperText={`${comment.length}/1000`} /><Box sx={{ mt: 2 }}><Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}><TextField fullWidth size="small" label={`Image URL (${photos.length}/${MAX_PHOTOS})`} placeholder="Paste an image or Google Drive URL" value={photoUrl} disabled={photos.length >= MAX_PHOTOS} onChange={(event) => setPhotoUrl(event.target.value)} /><Button variant="outlined" startIcon={<AddLinkOutlinedIcon />} disabled={!photoUrl.trim() || photos.length >= MAX_PHOTOS} onClick={addPhotoUrl}>Add</Button></Box><Typography variant="caption" color="text.secondary">Google Drive images must be shared with anyone who has the link.</Typography><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>{photos.map((photo, index) => <Box key={photo.slice(-24) + index} sx={{ position: 'relative' }}><Box component="img" src={photo} alt={`Review attachment ${index + 1}`} sx={{ width: 82, height: 82, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1' }} /><IconButton size="small" aria-label={`Remove photo ${index + 1}`} onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} sx={{ position: 'absolute', top: -10, right: -10, bgcolor: '#fff', border: '1px solid #cbd5e1' }}><CloseIcon fontSize="small" /></IconButton></Box>)}</Box></Box>{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}<Button type="submit" variant="contained" fullWidth disabled={saving || !productId} sx={{ mt: 3, py: 1.35 }}>{saving ? 'Saving review...' : savedReviews.some((review) => review.productId === productId) ? 'Update review' : 'Submit review'}</Button></Box></Box></>);
}
