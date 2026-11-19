import { useContext, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Rating, Select, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { getCustomerOrderHistory, isOrderServiceUnavailable, normalizeOrder, ORDER_STATUSES } from '../../services/orderApi';
import { clearCustomerNotifications, getAllCustomerNotifications, markNotificationRead, normalizeNotification } from '../../services/notificationApi';
import FulfillmentTrackingPanel from '../../components/FulfillmentTrackingPanel/FulfillmentTrackingPanel';
import { useFulfillmentTracking } from '../../hooks/useFulfillmentTracking';
import { getMyReviews } from '../../services/reviewApi';

const content = {
  notifications: { title: 'Notifications', empty: 'You have no notifications yet.' },
  reviews: { title: 'Ratings & Reviews', empty: 'No reviews have been submitted yet.' },
  loyalty: { title: 'Rewards & Offers', empty: 'Rewards, referrals and gift vouchers will appear here.' },
  localization: { title: 'Language & Currency', empty: 'Choose how content and prices are displayed.' },
  tracking: { title: 'Order Tracking', empty: 'Live tracking becomes available after an order is assigned for delivery.' },
  about: { title: 'About Us', empty: 'Authentic pickles, spices and traditional flavours prepared with care.' },
  contact: { title: 'Contact Us', empty: 'Call, email or use the Help Center to contact our support team.' },
};

const CustomerFeaturePage = ({ type }) => {
  const navigate = useNavigate();
  const { locale, updateLocale, user } = useContext(AppContext);
  const config = content[type] || content.notifications;
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState(locale.language);
  const [currency, setCurrency] = useState(locale.currency);
  const [timeZone, setTimeZone] = useState(locale.timeZone);
  const [notifications, setNotifications] = useState([]);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [trackingOrders, setTrackingOrders] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [customerReviews, setCustomerReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  useEffect(() => {
    if (type !== 'reviews') return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) { setReviewsLoading(true); setReviewsError(''); }
      return getMyReviews();
    }).then((rows) => { if (active) setCustomerReviews(Array.isArray(rows) ? rows : []); })
      .catch((error) => { if (active) setReviewsError(error.message || 'Your reviews could not be loaded.'); })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [type, user?.id]);
  useEffect(() => {
    if (type !== 'notifications' || !user?.id) return undefined;
    let active = true;
    getAllCustomerNotifications(user.id)
      .then((rows) => {
        if (active) setNotifications(rows.map(normalizeNotification));
      })
      .catch((error) => { if (active) setNotificationsError(error.message || 'Notifications could not be loaded.'); });
    return () => { active = false; };
  }, [type, user?.id]);
  const markRead = async (notification) => {
    if (!notification.id || notification.read) return;
    setNotificationsBusy(true); setNotificationsError('');
    try {
      const updated = normalizeNotification(await markNotificationRead(notification.id));
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setNotificationsError(error.message || 'This notification could not be marked as read.'); }
    finally { setNotificationsBusy(false); }
  };
  const clearNotifications = async () => {
    if (!user?.id || !notifications.length) return;
    setNotificationsBusy(true); setNotificationsError('');
    try {
      await clearCustomerNotifications(user.id);
      setNotifications([]);
    } catch (error) { setNotificationsError(error.message || 'Notifications could not be cleared.'); }
    finally { setNotificationsBusy(false); }
  };
  useEffect(() => {
    if (type !== 'tracking' || !user?.id) return undefined;
    let ignore = false;
    const timer = window.setTimeout(() => {
      if (!ignore) {
        setTrackingLoading(true);
        setTrackingError('');
      }
    }, 0);
    Promise.resolve().then(() => getCustomerOrderHistory(user.id))
      .then((payload) => {
        if (!ignore) {
          const rows = Array.isArray(payload) ? payload : payload?.orders || payload?.content || [];
          setTrackingOrders(rows.map(normalizeOrder));
        }
      })
      .catch((error) => {
        if (!ignore) {
          setTrackingOrders([]);
          setTrackingError(isOrderServiceUnavailable(error) ? 'Order Service is unavailable.' : error.message);
        }
      })
      .finally(() => {
        if (!ignore) setTrackingLoading(false);
      });
    return () => { ignore = true; window.clearTimeout(timer); };
  }, [type, user?.id]);
  const trackedOrder = trackingOrders[0] || null;
  const fulfillmentTracking = useFulfillmentTracking(type === 'tracking' ? trackedOrder?.id : '');

  const saveLocale = () => {
    updateLocale({ language, currency, timeZone });
    setMessage('Language, currency and timezone preferences saved.');
  };

  return (
    <Box sx={{ height: '100dvh', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f8fafc' }}>
      <Box sx={{ flex: '0 0 auto', bgcolor: '#075F40', color: 'white', p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button onClick={() => navigate(-1)} sx={{ color: 'white' }}>Back</Button>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{config.title}</Typography>
      </Box>
      <Box sx={{ flex: '1 1 auto', minHeight: 0, width: '100%', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
      <Box sx={{ maxWidth: 760, mx: 'auto', p: 3 }}>
        <Box sx={{ bgcolor: 'white', borderRadius: 3, p: 3, boxShadow: '0 4px 16px rgba(15,23,42,.08)' }}>
          <Typography sx={{ color: '#64748b', mb: 2 }}>{config.empty}</Typography>

          {type === 'notifications' && <Box sx={{ display: 'grid', gap: 1.5 }}>
            {notificationsError && <Alert severity="error" role="alert">{notificationsError}</Alert>}
            {notifications.length > 0 && <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><Button color="inherit" disabled={notificationsBusy} onClick={clearNotifications}>Clear all</Button></Box>}
            {!notificationsError && notifications.length === 0 ? <Typography>No notifications to show.</Typography> : notifications.map((item) => <Box key={item.id} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: item.read ? '#fff' : '#ecfdf5', display: 'grid', gap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Typography fontWeight={700}>{item.subject || 'Order update'}</Typography>{!item.read && <Chip size="small" color="success" label="New" />}</Box>
              <Typography>{item.message}</Typography>
              <Typography variant="caption" color="text.secondary">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {item.orderId && <Button size="small" onClick={() => { markRead(item); navigate(`/order-details/${encodeURIComponent(item.orderId)}`, { state: { orderId: item.orderId } }); }}>View order</Button>}
                {!item.read && <Button size="small" disabled={notificationsBusy} onClick={() => markRead(item)}>Mark as read</Button>}
              </Box>
            </Box>)}
          </Box>}

          {type === 'reviews' && <Box sx={{ display:'grid',gap:2 }}>
            {reviewsLoading && <Typography role="status">Loading your reviews...</Typography>}
            {reviewsError && <Alert severity="error" role="alert">{reviewsError}</Alert>}
            {!reviewsLoading && !reviewsError && !customerReviews.length && <Typography>{config.empty}</Typography>}
            {customerReviews.map((review) => <Box key={review.id} sx={{ p:2,border:'1px solid #e2e8f0',borderRadius:2,display:'grid',gap:1 }}>
              <Box sx={{ display:'flex',justifyContent:'space-between',gap:1,flexWrap:'wrap' }}><Typography fontWeight={700}>{review.productName}</Typography><Chip size="small" label={review.status} color={review.status==='APPROVED'?'success':review.status==='REJECTED'?'error':'warning'} /></Box>
              <Rating value={Number(review.rating)||0} readOnly size="small" />
              {review.comment && <Typography sx={{ whiteSpace:'pre-wrap' }}>{review.comment}</Typography>}
              {!!review.photoUrls?.length && <Box sx={{ display:'flex',gap:1,flexWrap:'wrap' }}>{review.photoUrls.map((photo,index)=><Box component="img" key={`${review.id}:${index}`} src={photo} alt={`Review photo ${index+1}`} sx={{ width:72,height:72,objectFit:'cover',borderRadius:1 }} />)}</Box>}
              {review.adminReply && <Alert severity="info"><strong>Store response:</strong> {review.adminReply}</Alert>}
              <Typography variant="caption" color="text.secondary">Order {review.orderNumber}</Typography>
            </Box>)}
            <Button variant="outlined" onClick={() => navigate('/orders')}>Open order history</Button>
          </Box>}
          {type === 'localization' && <Box sx={{ display: 'grid', gap: 2 }}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)} inputProps={{ 'aria-label': 'Language' }}>
              {['English', 'Hindi', 'Telugu'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </Select>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)} inputProps={{ 'aria-label': 'Currency' }}>
              {['INR', 'USD'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </Select>
            <Select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} inputProps={{ 'aria-label':'Time zone' }}><MenuItem value="Asia/Kolkata">Asia/Kolkata</MenuItem><MenuItem value="UTC">UTC</MenuItem><MenuItem value="America/New_York">America/New_York</MenuItem><MenuItem value="Europe/London">Europe/London</MenuItem><MenuItem value="Asia/Dubai">Asia/Dubai</MenuItem></Select>
            <Button variant="contained" onClick={saveLocale}>Save Preferences</Button>
            <Typography>Application version: 1.0.0</Typography>
            <Button variant="outlined" onClick={() => window.location.reload()}>Check for Updates</Button>
          </Box>}

          {type === 'tracking' && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {ORDER_STATUSES.map((item) => { const current=trackedOrder;return <Chip key={item} label={item} color={current && ORDER_STATUSES.indexOf(item)<=ORDER_STATUSES.indexOf(current.status) ? 'success' : 'default'} />; })}
          </Box>}

          {type === 'tracking' && <Box sx={{ mt:2, display: 'grid', gap: 2 }}>{trackingLoading ? <Typography role="status">Loading orders...</Typography> : trackingError ? <Typography role="alert" color="error">{trackingError}</Typography> : !trackedOrder ? <Typography>No orders to track.</Typography> : <><Box><Typography fontWeight={700}>{trackedOrder.id}</Typography><Typography>Status: {trackedOrder.status}</Typography><Button onClick={() => navigate(`/order-details/${encodeURIComponent(trackedOrder.id)}`, { state: { orderId: trackedOrder.id } })}>View Details</Button></Box><FulfillmentTrackingPanel order={trackedOrder} {...fulfillmentTracking} /></>}</Box>}

          {type === 'loyalty' && <Typography color="text.secondary">Rewards will appear here when the rewards service is available.</Typography>}

          {message && <Typography role="status" sx={{ color: '#075F40', mt: 2 }}>{message}</Typography>}
        </Box>
      </Box>
      </Box>
    </Box>
  );
};

export default CustomerFeaturePage;
