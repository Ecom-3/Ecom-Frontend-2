import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, MenuItem, Rating, Select, TextField, Typography } from '@mui/material';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import ReviewsOutlinedIcon from '@mui/icons-material/ReviewsOutlined';
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { getAdminReviews, moderateReview } from '../../services/reviewApi';

const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

export default function AdminReviewsPanel({ role }) {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [replies, setReplies] = useState({});
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [counts, setCounts] = useState({ total: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [result, pending, approved, rejected] = await Promise.all([
        getAdminReviews({ status, page, size: 10 }),
        getAdminReviews({ status: 'PENDING', page: 0, size: 1 }),
        getAdminReviews({ status: 'APPROVED', page: 0, size: 1 }),
        getAdminReviews({ status: 'REJECTED', page: 0, size: 1 }),
      ]);
      setData(result || { content: [], totalPages: 0, totalElements: 0 });
      setReplies(Object.fromEntries((result?.content || []).map((review) => [review.id, review.adminReply || ''])));
      setCounts({ total: (pending?.totalElements || 0) + (approved?.totalElements || 0) + (rejected?.totalElements || 0), PENDING: pending?.totalElements || 0, APPROVED: approved?.totalElements || 0, REJECTED: rejected?.totalElements || 0 });
    } catch (requestError) { setError(requestError.message || 'Reviews could not be loaded.'); }
    finally { setLoading(false); }
  }, [status, page]);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const update = async (review, nextStatus) => {
    setBusyId(review.id); setError(''); setMessage('');
    try {
      await moderateReview(review.id, { status: nextStatus, adminReply: replies[review.id] || '' });
      setMessage(`Review ${nextStatus.toLowerCase()} and saved.`);
      await load();
    } catch (requestError) { setError(requestError.message || 'The review update could not be saved.'); }
    finally { setBusyId(''); }
  };

  const reviews = useMemo(() => (data.content || []).filter((review) => [review.customerName, review.customer?.name, review.orderNumber, review.orderId, review.productName, review.comment]
    .some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))), [data.content, search]);

  return <Box sx={{ p: { xs: 1, md: 1.25 }, borderRadius: 3, background: 'linear-gradient(135deg,#eff8f3 0%,#f5faf9 100%)', minHeight: 'calc(100vh - 140px)' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.2, px: .8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Box sx={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 2, color: '#079637', bgcolor: '#e0f6e6' }}><StarBorderOutlinedIcon sx={{ fontSize: 28 }} /></Box><Box><Typography sx={{ color: '#172a43', fontSize: 21, fontWeight: 800, lineHeight: 1.2 }}>Reviews</Typography><Typography sx={{ color: '#53657b', fontSize: 11 }}>Manage and moderate customer reviews across your stores and products.</Typography></Box></Box>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: .5, pr: 1, color: '#c88629', fontSize: 24 }} aria-hidden="true">✦ ✹ ✦</Box>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,minmax(0,1fr))' }, gap: 1, mb: 1.1 }}>
      {[
        { label: 'Total Reviews', value: counts.total, caption: 'All customer reviews', icon: <ReviewsOutlinedIcon />, fg: '#12a143', bg: '#e5f8e9' },
        { label: 'Pending', value: counts.PENDING, caption: 'Awaiting approval', icon: <HourglassTopOutlinedIcon />, fg: '#f0a000', bg: '#fff4d9' },
        { label: 'Approved', value: counts.APPROVED, caption: 'Visible to customers', icon: <CheckCircleOutlineOutlinedIcon />, fg: '#168cf0', bg: '#e4f3ff' },
        { label: 'Rejected', value: counts.REJECTED, caption: 'Not shown to customers', icon: <HighlightOffOutlinedIcon />, fg: '#f04459', bg: '#ffe8ed' },
      ].map((card) => <Box key={card.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minHeight: 69, p: 1.2, borderRadius: 2, border: `1px solid ${card.fg}20`, background: `linear-gradient(115deg,${card.bg},#fff)` }}><Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: card.bg, color: card.fg }}>{card.icon}</Box><Box><Typography sx={{ fontSize: 20, fontWeight: 800, color: '#172a43', lineHeight: 1 }}>{card.value}</Typography><Typography sx={{ fontSize: 10, fontWeight: 750, color: '#26384f' }}>{card.label}</Typography><Typography sx={{ fontSize: 9, color: '#64748b' }}>{card.caption}</Typography></Box></Box>)}
    </Box>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
    <Box sx={{ p: 1.1, borderRadius: 2.5, bgcolor: '#fff', border: '1px solid #e9eff0', boxShadow: '0 4px 18px #153b2510' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.1 }}>
        <TextField size="small" placeholder="Search by customer, order ID, or review text..." value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <SearchOutlinedIcon sx={{ mr: .8, color: '#25364c', fontSize: 19 }} /> }} sx={{ flex: '1 1 260px', maxWidth: 320, '& .MuiOutlinedInput-root': { height: 36, borderRadius: 2, fontSize: 10.5 } }} />
        <Select size="small" value={status} onChange={(event) => { setPage(0); setStatus(event.target.value); }} aria-label="Review moderation status" sx={{ minWidth: 96, height: 36, borderRadius: 2, fontSize: 10.5, fontWeight: 700 }}><MenuItem value="">All statuses</MenuItem>{statuses.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
        <Button size="small" startIcon={<RefreshOutlinedIcon />} onClick={load} sx={{ color: '#078953', fontWeight: 750, textTransform: 'none', fontSize: 10.5 }}>Refresh</Button>
        <Select size="small" defaultValue="all" aria-label="Review time range" sx={{ ml: 'auto', minWidth: 105, height: 36, borderRadius: 2, fontSize: 10.5, fontWeight: 700 }}><MenuItem value="all">All Time</MenuItem><MenuItem value="month">This Month</MenuItem><MenuItem value="week">This Week</MenuItem></Select>
      </Box>
    {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={26} /></Box>
      : !reviews.length ? <Typography color="text.secondary" sx={{ p: 2, fontSize: 12 }}>No reviews match this status.</Typography>
        : reviews.map((review) => <Box key={review.id} sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, p: 1.4, mb: .8, border: '1px solid #e8edef', borderLeft: '2px solid #ffb000', borderRadius: 2.5, boxShadow: '0 2px 9px #153b2509' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}><Avatar sx={{ width: 34, height: 34, bgcolor: '#e2f4e8', color: '#17834c', fontSize: 12, fontWeight: 700 }}>{String(review.customerName || review.customer?.name || '?').charAt(0).toUpperCase()}</Avatar><Box><Box sx={{ display: 'flex', gap: .8, alignItems: 'center', flexWrap: 'wrap' }}><Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1d2d42' }}>{review.customerName || review.customer?.name || review.productName || 'Customer'}</Typography><Chip size="small" label={review.status} sx={{ height: 18, bgcolor: review.status === 'APPROVED' ? '#dff6e7' : review.status === 'REJECTED' ? '#ffe7eb' : '#fff1db', color: review.status === 'APPROVED' ? '#087e40' : review.status === 'REJECTED' ? '#d12c43' : '#c75a00', fontSize: 8.5, fontWeight: 800 }} /></Box><Rating value={Number(review.rating) || 0} readOnly size="small" sx={{ '& .MuiRating-icon': { fontSize: 17 } }} /></Box><Box sx={{ height: 30, width: '1px', bgcolor: '#e2e8ee', mx: .8, display: { xs: 'none', sm: 'block' } }} /><Typography sx={{ fontSize: 10, color: '#506078', display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: .5 }}><ShoppingBagOutlinedIcon sx={{ color: '#118650', fontSize: 14 }} />Order ID: {review.orderNumber || review.orderId || review.id}</Typography><Typography sx={{ ml: 'auto', fontSize: 9.5, color: '#56657a', display: 'flex', alignItems: 'center', gap: .5, whiteSpace: 'nowrap' }}><AccessTimeOutlinedIcon sx={{ fontSize: 14, color: '#8793a3' }} />{review.createdAt ? new Date(review.createdAt).toLocaleString() : ''}</Typography></Box>
            {!!review.photoUrls?.length && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 5 }}>{review.photoUrls.map((url, index) => <Box key={`${review.id}:${index}`} component="img" src={url} alt={`Customer review ${index + 1}`} sx={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 1 }} />)}</Box>}
            <Typography sx={{ whiteSpace: 'pre-wrap', my: .4, ml: 5, fontSize: 12 }}>{review.comment || 'No written comment.'}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', ml: 5 }}><TextField fullWidth size="small" placeholder="Reply to customer..." value={replies[review.id] || ''} inputProps={{ maxLength: 1000 }} onChange={(event) => setReplies((current) => ({ ...current, [review.id]: event.target.value }))} sx={{ flex: '1 1 260px', '& .MuiOutlinedInput-root': { height: 33, borderRadius: 1.8, fontSize: 10.5 } }} />
              <Button size="small" variant="outlined" color="error" disabled={busyId === review.id} onClick={() => update(review, 'REJECTED')} startIcon={<HighlightOffOutlinedIcon />} sx={{ height: 33, fontSize: 10, textTransform: 'none' }}>Reject</Button>
              <Button size="small" variant="contained" disabled={busyId === review.id} onClick={() => update(review, 'APPROVED')} startIcon={<CheckCircleOutlineOutlinedIcon />} sx={{ height: 33, bgcolor: '#087c50', fontSize: 10, fontWeight: 750, textTransform: 'none', whiteSpace: 'nowrap' }}>{busyId === review.id ? 'Saving...' : 'Approve & Save Reply'}</Button></Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button disabled={busyId === review.id} onClick={() => update(review, 'REJECTED')}>Reject</Button>
            <Button variant="contained" disabled={busyId === review.id} onClick={() => update(review, 'APPROVED')}>{busyId === review.id ? 'Saving…' : 'Approve & save reply'}</Button>
          </Box>
        </Box>)}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1, px: .5 }}><Typography sx={{ fontSize: 10, color: '#34445a' }}>Showing {reviews.length ? page * 10 + 1 : 0} – {Math.min(page * 10 + reviews.length, data.totalElements)} of {data.totalElements} reviews</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}><Button size="small" disabled={page <= 0 || loading} onClick={() => setPage((current) => current - 1)} sx={{ minWidth: 30, width: 30, height: 30, bgcolor: '#f2f4f6', color: '#667085' }}>‹</Button><Typography sx={{ px: 1.2, py: .7, bgcolor: '#087c50', color: '#fff', borderRadius: 1.5, fontSize: 10, fontWeight: 750 }}>{page + 1}</Typography><Button size="small" disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage((current) => current + 1)} sx={{ minWidth: 30, width: 30, height: 30, bgcolor: '#f2f4f6', color: '#667085' }}>›</Button></Box></Box>
    </Box>
  </Box>;
}
