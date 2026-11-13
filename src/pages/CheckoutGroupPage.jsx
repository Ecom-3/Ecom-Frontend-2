import { useContext, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import CheckoutGroupResult from '../components/CheckoutGroupResult';
import { getCheckoutGroup, retryCheckoutGroup } from '../services/orderApi';
import { resetFailedCheckout } from '../utils/checkoutGroup';

const COMPLETED_CHECKOUT_RETURN_KEY = 'freshcart.completedCheckoutReturnToCart';

export default function CheckoutGroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, user, clearCartAfterCheckout } = useContext(AppContext);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const stopped = useRef(false);
  const [recovering, setRecovering] = useState(false);
  const recoveryBusy = useRef(false);
  const resumedGroup = useRef(null);
  const clearedCompletedGroup = useRef('');
  const reviewCart = async () => {
    if (recoveryBusy.current) return;
    recoveryBusy.current = true;
    setRecovering(true);
    try {
      const current = await getCheckoutGroup(groupId);
      if (current.id !== groupId) throw new Error('Checkout identity could not be verified.');
      resetFailedCheckout(current, user?.id);
      navigate('/cart');
    } catch (reason) { setError(reason.message); }
    finally { recoveryBusy.current = false; setRecovering(false); }
  };
  const recover = async () => {
    if (recoveryBusy.current) return;
    recoveryBusy.current = true;
    setRecovering(true);
    try {
      const result = await retryCheckoutGroup(groupId);
      if (result.id !== groupId || result.customerId !== user?.id) throw new Error('Checkout ownership could not be verified.');
      setGroup(result);
      setError('');
      setRetry((value) => value + 1);
    } catch (reason) { setError(reason.message); }
    finally { recoveryBusy.current = false; setRecovering(false); }
  };
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    let timer;
    stopped.current = false;
    const load = async () => {
      try {
        let result = await getCheckoutGroup(groupId);
        if (!active) return;
        if (result.id !== groupId || result.customerId !== user.id) throw new Error('Checkout ownership could not be verified.');
        if (result.state === 'PREPARED' && resumedGroup.current !== groupId && !recoveryBusy.current) {
          resumedGroup.current = groupId;
          result = await retryCheckoutGroup(groupId);
          if (!active) return;
          if (result.id !== groupId || result.customerId !== user.id) throw new Error('Checkout ownership could not be verified.');
        }
        setGroup(result);
        setError('');
        stopped.current = ['COMPLETED', 'FAILED'].includes(result.state);
      } catch (reason) {
        if (!active) return;
        setError(reason.status === 404 ? 'Combined checkout is not available yet.' : reason.message);
        stopped.current = true;
      }
      if (active && !stopped.current) timer = setTimeout(load, 3000);
    };
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [groupId, user?.id, retry]);
  useEffect(() => {
    if (group?.state !== 'COMPLETED' || !group.id || clearedCompletedGroup.current === group.id) return;
    sessionStorage.setItem(COMPLETED_CHECKOUT_RETURN_KEY, group.id);
    clearedCompletedGroup.current = group.id;
    clearCartAfterCheckout();
  }, [group?.id, group?.state, clearCartAfterCheckout]);
  return <Box component="main" sx={{ width: '100%', boxSizing: 'border-box', minHeight: '100vh', border: '2px solid #087454', borderTopWidth: 6, bgcolor: '#f3f7f5', px: { xs: 2, md: 5 }, py: 2, color: '#173b2e' }}>
    <Box sx={{ width: '100%', mx: 'auto' }}>
    <Button startIcon={<ArrowBackIcon />} sx={{ color: '#087454', textTransform: 'none' }} onClick={() => navigate('/orders')}>Orders</Button>
    {!user?.id ? <Button onClick={() => navigate('/login')}>Sign In</Button> : group?.id === groupId && group?.customerId === user.id
      ? <Box aria-busy={recovering}><CheckoutGroupResult group={group} error={error} onRetry={recover} onNewCheckout={reviewCart} onOrder={(id) => navigate(`/order-details/${encodeURIComponent(id)}`)} onCart={() => navigate('/cart', { replace: true })} formatCurrency={formatCurrency} /></Box>
      : error ? <><Typography role="alert">{error}</Typography><Button onClick={() => setRetry((value) => value + 1)}>Try Again</Button></>
        : <CircularProgress aria-label="Loading checkout" />}
    </Box>
  </Box>;
}
