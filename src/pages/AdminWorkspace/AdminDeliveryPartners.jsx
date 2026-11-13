import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, Switch, TextField, Typography, FormControlLabel, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { createDeliveryPartner, getDeliveryPartners, setDeliveryPartnerActive } from '../../services/deliveryPartnerApi';
import { deliveryPartnerLocation } from '../../services/deliveryPartnerLocation.js';
import DeliveryPartnerDetailsDialog from '../../components/DeliveryPartnerDetailsDialog.jsx';
import { orgAccessService } from '../../services/orgAccessService.js';
import PasswordField from '../../components/PasswordField.jsx';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import NavigateBeforeOutlinedIcon from '@mui/icons-material/NavigateBeforeOutlined';
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined';

const locationUpdated = (partner) => {
  if (!deliveryPartnerLocation(partner)) return 'No valid GPS location shared';
  const date = partner.deliveryLocationUpdatedAt ? new Date(partner.deliveryLocationUpdatedAt) : null;
  return date && !Number.isNaN(date.getTime()) ? `Location updated ${date.toLocaleString()}` : 'Location available';
};
const displayRegion = (value) => String(value || '').trim().replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const mobilePattern = /^[+0-9 ()-]{7,30}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminDeliveryPartners({ role, location, stores = [] }) {
  const [partners, setPartners] = useState([]);
  const [managerStoreIds, setManagerStoreIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({name:'',mobile:'',username:'',email:'',password:'',vehicleType:'Bike',vehicleNumber:'',licenceNumber:'',address:'',active:true,storeId:''});
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getDeliveryPartners();
      setPartners(Array.isArray(rows) ? rows : []);
    } catch (reason) {
      setError(reason.message || 'Unable to load delivery partners.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let ignore = false;
    const staffRequest = role === 'location-admin' ? orgAccessService.listUsers() : Promise.resolve([]);
    Promise.all([getDeliveryPartners(), staffRequest]).then(([rows, staff]) => {
      if (ignore) return;
      setPartners(Array.isArray(rows) ? rows : []);
      setManagerStoreIds(Array.isArray(staff) ? staff.filter((item) => String(item.role || '').toUpperCase() === 'STORE_MANAGER').map((item) => String(item.storeId || '')).filter(Boolean) : []);
    }).catch((reason) => { if (!ignore) setError(reason.message || 'Unable to load delivery partners.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [role]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = partners.filter((partner) => {
      const active = partner.status === 'Active' || partner.active === true;
      if (statusFilter === 'active' && !active) return false;
      if (statusFilter === 'inactive' && active) return false;
      if (locationFilter !== 'all' && displayRegion(partner.location) !== locationFilter) return false;
      return !term || [partner.name, partner.username, partner.email, partner.mobile, partner.phone,
        partner.store, partner.storeLocation, partner.location, partner.address, partner.vehicleType, partner.vehicleNumber, partner.licenceNumber]
        .some((value) => String(value || '').trim().toLowerCase().includes(term));
    });
    return [...rows].sort((a, b) => sortOrder === 'newest'
      ? new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
      : String(a.name || '').localeCompare(String(b.name || '')));
  }, [partners, query, statusFilter, locationFilter, sortOrder]);
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePartners = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [query, statusFilter, locationFilter, sortOrder]);
  const locationStores = useMemo(() => stores.filter((store) =>
    String(store.location || '').trim().toLowerCase() === String(location || '').trim().toLowerCase() && managerStoreIds.includes(String(store.id))), [stores, location, managerStoreIds]);
  const updateStatus = async (partner, active) => {
    setPendingStatus(String(partner.id)); setError('');
    try {
      const saved = await setDeliveryPartnerActive(partner.id, active);
      setPartners((current) => current.map((item) => String(item.id) === String(partner.id) ? {...item,...saved,status:active?'Active':'Inactive',active} : item));
    } catch (reason) { setError(reason.message || 'Unable to update partner status.'); }
    finally { setPendingStatus(''); }
  };
  const submitPasswordReset = async () => {
    setResetError('');
    if (resetPassword.length < 8 || resetPassword.length > 100) return setResetError('Password must be between 8 and 100 characters.');
    if (resetPassword !== resetPasswordConfirm) return setResetError('Passwords do not match.');
    setResetting(true);
    try {
      await orgAccessService.resetManagedStaffPassword(resetTarget?.id, resetPassword);
      setResetTarget(null); setResetPassword(''); setResetPasswordConfirm('');
      setResetMessage(`Password reset for ${resetTarget?.name || 'Delivery Partner'}. Existing sessions have been signed out.`);
    } catch (reason) { setResetError(reason.message || 'Unable to reset this Delivery Partner password.'); }
    finally { setResetting(false); }
  };
  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name='Name is required.';
    else if (form.name.trim().length>180) next.name='Name must be 180 characters or fewer.';
    if (!form.mobile.trim()) next.mobile='Mobile number is required.';
    else if (!mobilePattern.test(form.mobile.trim())) next.mobile='Enter a valid mobile number.';
    if (!form.username.trim()) next.username='Login username is required.';
    else if (form.username.trim().length>190) next.username='Username must be 190 characters or fewer.';
    if (!form.email.trim()) next.email='Email is required.';
    else if (!emailPattern.test(form.email.trim()) || form.email.length>255) next.email='Enter a valid email address (255 characters or fewer).';
    if (!form.password) next.password='Password is required.';
    else if (form.password.length<8 || form.password.length>100) next.password='Password must be between 8 and 100 characters.';
    if (!form.vehicleType.trim()) next.vehicleType='Vehicle type is required.';
    if (!form.vehicleNumber.trim()) next.vehicleNumber='Vehicle number is required.';
    else if (form.vehicleNumber.length>40) next.vehicleNumber='Vehicle number must be 40 characters or fewer.';
    if (!form.licenceNumber.trim()) next.licenceNumber='Licence number is required.';
    else if (form.licenceNumber.length>60) next.licenceNumber='Licence number must be 60 characters or fewer.';
    if (form.address.length>700) next.address='Address must be 700 characters or fewer.';
    if (role==='location-admin' && !form.storeId) next.storeId='Select a store in your assigned location.';
    setFieldErrors(next); return !Object.keys(next).length;
  };
  const submit = async (event) => {
    event.preventDefault(); setFormError('');
    if (creating || !validate()) return;
    setCreating(true);
    try {
      const selectedStore=locationStores.find((store)=>String(store.id)===String(form.storeId));
      await createDeliveryPartner({...form, ...(role==='location-admin'?{location,storeId:selectedStore?.id}: {})});
      setCreateOpen(false); setForm({name:'',mobile:'',username:'',email:'',password:'',vehicleType:'Bike',vehicleNumber:'',licenceNumber:'',address:'',active:true,storeId:''});
      await load();
    } catch(reason) {
      const fields=reason.payload?.fields;
      if(fields&&typeof fields==='object') setFieldErrors(fields);
      setFormError(reason.message||'Unable to create delivery partner.');
    } finally { setCreating(false); }
  };
  const field=(key,label,type='text',required=false,maxLength)=> <TextField key={key} fullWidth label={label} type={type} required={required} value={form[key]} slotProps={{htmlInput:maxLength?{maxLength}:undefined}} error={Boolean(fieldErrors[key])} helperText={fieldErrors[key]} onChange={(event)=>setForm((current)=>({...current,[key]:event.target.value}))}/>;

  const activeCount = partners.filter((partner) => partner.status === 'Active' || partner.active === true).length;
  const inactiveCount = Math.max(0, partners.length - activeCount);
  const regionCount = new Set(partners.map((partner) => String(partner.location || '').trim()).filter(Boolean)).size;
  const statCards = [
    { label: 'Total Partners', value: partners.length, hint: 'Active + inactive', icon: <PeopleAltOutlinedIcon />, color: '#0c9b60', tint: '#effbf4' },
    { label: 'Active Partners', value: activeCount, hint: 'Currently on duty', icon: <CheckCircleOutlineOutlinedIcon />, color: '#18ad5b', tint: '#effbf4' },
    { label: 'Inactive Partners', value: inactiveCount, hint: 'Not available', icon: <ScheduleOutlinedIcon />, color: '#8158ea', tint: '#f6f2ff' },
    { label: 'Service Regions', value: regionCount, hint: 'Across locations', icon: <LocationOnOutlinedIcon />, color: '#1684dc', tint: '#f0f7ff' },
  ];

  return <>
    <Box sx={{ bgcolor: 'transparent', p: { xs: .75, md: 1 }, borderRadius: 3, background: 'linear-gradient(145deg,#f5fbf8,#f5f9fc)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: '#dff8eb', color: '#07834e' }}><TwoWheelerOutlinedIcon /></Box>
          <Box><Typography sx={{ fontWeight: 800, color: '#1b3028', fontSize: 19 }}>Delivery Partners</Typography><Typography sx={{ color: '#648174', fontSize: 10.5 }}>Manage delivery partners within your assigned scope. Track their status, location and service details.</Typography></Box>
        </Box>
        <Box sx={{display:'flex',gap:1,flexWrap:'wrap'}}>
          {role==='location-admin'&&<Button variant="contained" onClick={()=>{setFormError('');setFieldErrors({});setCreateOpen(true);}} disabled={!locationStores.length}>Create Delivery Partner</Button>}
          <Button onClick={load} disabled={loading} variant="outlined" sx={{ borderRadius: 2, borderColor: '#70b99b', color: '#08764b', textTransform: 'none', fontWeight: 700, fontSize: 11, py: .65 }}>+ &nbsp; Refresh Partners</Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: .8, flexWrap: 'wrap', alignItems: 'center', mb: 1, p: .8, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5efeb' }}>
        <TextField size="small" placeholder="Search by partner name, store, location, bike number..." value={query} onChange={(event) => setQuery(event.target.value)} sx={{ flex: '1 1 300px', '& .MuiOutlinedInput-root': { height: 38, borderRadius: 1.7 }, '& input': { fontSize: 10.5 } }} />
        <TextField select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { height: 38, fontSize: 10.5 } }}><MenuItem value="all">All Status</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField>
        <TextField select size="small" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} sx={{ minWidth: 125, '& .MuiOutlinedInput-root': { height: 38, fontSize: 10.5 } }}><MenuItem value="all">All Locations</MenuItem>{[...new Set(partners.map((partner) => displayRegion(partner.location)).filter(Boolean))].map((region) => <MenuItem key={region} value={region}>{region}</MenuItem>)}</TextField>
        <TextField select size="small" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} sx={{ minWidth: 110, '& .MuiOutlinedInput-root': { height: 38, fontSize: 10.5 } }}><MenuItem value="newest">Newest</MenuItem><MenuItem value="name">Name</MenuItem></TextField>
        <Button aria-label="Filters" sx={{ minWidth: 38, width: 38, height: 38, borderRadius: 1.5, bgcolor: '#eff8f4', color: '#07945a' }}><FilterListOutlinedIcon fontSize="small" /></Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4,minmax(0,1fr))' }, gap: 1, mb: 1 }}>
        {statCards.map((card) => <Box key={card.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.1, minHeight: 62, borderRadius: 2, border: `1px solid ${card.color}20`, background: `linear-gradient(120deg,${card.tint},#fff)` }}><Box sx={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: `${card.color}19`, color: card.color }}>{card.icon}</Box><Box><Typography sx={{ color: '#597064', fontSize: 10, fontWeight: 650 }}>{card.label}</Typography><Typography sx={{ fontWeight: 850, color: '#19372b', lineHeight: 1.1, fontSize: 16 }}>{loading ? '-' : card.value}</Typography><Typography sx={{ color: '#80948a', fontSize: 9 }}>{card.hint}</Typography></Box></Box>)}
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={load}>Retry</Button>}>{error}</Alert>}
      {resetMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResetMessage('')}>{resetMessage}</Alert>}
      {loading ? <Typography>Loading delivery partners...</Typography> : filtered.length ? visiblePartners.map((partner) => <Box key={partner.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(185px,1.4fr) minmax(100px,.8fr) minmax(130px,1fr) minmax(100px,.8fr) auto' }, justifyContent: 'space-between', alignItems: 'center', columnGap: 1, rowGap: .6, p: .85, mb: .55, border: '1px solid #e7efed', borderLeft: `2px solid ${partner.status === 'Active' ? '#20b96b' : '#f16c78'}`, borderRadius: 2, bgcolor: '#fff', boxShadow: '0 2px 8px #163f2a08' }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .8 }}><Avatar sx={{ width: 36, height: 36, bgcolor: '#e5f4ed', color: '#07834e' }}><TwoWheelerOutlinedIcon sx={{ fontSize: 22 }} /></Avatar><Box sx={{ minWidth: 0 }}><Typography noWrap fontWeight={750} sx={{ color: '#20372d', fontSize: 11 }}>{partner.name || 'Delivery Partner'}</Typography><Typography noWrap sx={{ fontSize: 9, color: '#72897e' }}>Bike No: {partner.vehicleNumber || 'Not recorded'}</Typography><Chip size="small" label={partner.licenceNumber ? 'Verified' : 'Unverified'} sx={{ height: 14, fontSize: 8, bgcolor: partner.licenceNumber ? '#e5f8ec' : '#eef2f4', color: partner.licenceNumber ? '#13844c' : '#65737d' }} /></Box></Box>
        </Box>
        <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 9, color: '#71877d' }}><LocationOnOutlinedIcon sx={{ fontSize: 12, mr: .35, verticalAlign: 'middle', color: '#159b67' }}/>Service Region</Typography><Typography noWrap sx={{ fontSize: 9, color: '#426055', pl: 2 }}>{displayRegion(partner.location) || 'Not assigned'}</Typography></Box>
        <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 9, color: '#71877d' }}><StorefrontOutlinedIcon sx={{ fontSize: 12, mr: .35, verticalAlign: 'middle', color: '#159b67' }}/>Assigned Store</Typography><Typography noWrap sx={{ fontSize: 9, color: '#426055', pl: 2 }}>{partner.store || 'Not assigned'}</Typography></Box>
        <Box sx={{ minWidth: 0 }}><Chip size="small" label={partner.status || 'Unknown'} sx={{ height: 17, fontSize: 8.5, fontWeight: 700, bgcolor: partner.status === 'Active' ? '#e0f8e9' : '#fff0f0', color: partner.status === 'Active' ? '#148447' : '#d74854' }} /><Typography display="block" sx={{ fontSize: 8.5, color: '#71877d', mt: .25 }}><AccessTimeOutlinedIcon sx={{ fontSize: 11, mr: .3, verticalAlign: 'middle' }}/>{locationUpdated(partner)}</Typography></Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: .5, justifyContent: 'flex-end' }}>
          {role==='location-admin'&&<FormControlLabel sx={{m:0}} label="" control={<Switch size="small" checked={partner.active ?? partner.status==='Active'} disabled={pendingStatus===String(partner.id)} onChange={(event)=>updateStatus(partner,event.target.checked)} slotProps={{input:{'aria-label':`Set ${partner.name} active status`}}}/>}/>}
          {role==='location-admin'&&<Button size="small" onClick={()=>{setResetTarget(partner);setResetPassword('');setResetPasswordConfirm('');setResetError('');}}>Reset</Button>}
          <Button size="small" startIcon={<VisibilityOutlinedIcon sx={{fontSize:'13px !important'}}/>} onClick={() => setSelected(partner)} sx={{minWidth:52,px:.8,bgcolor:'#f1f8f5',color:'#176246',fontSize:9,textTransform:'none'}}>View</Button>
          <Button size="small" startIcon={<LocationOnOutlinedIcon sx={{fontSize:'13px !important'}}/>} onClick={() => setSelected(partner)} sx={{minWidth:58,px:.8,bgcolor:'#f1f8f5',color:'#176246',fontSize:9,textTransform:'none'}}>Location</Button>
          <Button size="small" aria-label={`More actions for ${partner.name}`} onClick={() => setSelected(partner)} sx={{minWidth:26,width:26,height:27,p:0,bgcolor:'#f1f8f5',color:'#176246'}}><MoreVertOutlinedIcon sx={{fontSize:17}}/></Button>
        </Box>
      </Box>) : <Typography color="text.secondary">{partners.length ? 'No partners match this search.' : 'No delivery partners in your authorized scope.'}</Typography>}
      {!loading&&filtered.length>0&&<Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',px:.5,pt:.35}}><Typography sx={{fontSize:9,color:'#72877e'}}>Showing {Math.min(filtered.length,(page-1)*pageSize+1)} - {Math.min(filtered.length,page*pageSize)} of {filtered.length} delivery partners</Typography><Box sx={{display:'flex',alignItems:'center',gap:.5}}><Button size="small" disabled={page===1} onClick={()=>setPage((value)=>Math.max(1,value-1))} sx={{minWidth:24,width:24,p:0,color:'#637e71'}}><NavigateBeforeOutlinedIcon fontSize="small"/></Button><Typography sx={{px:1,py:.3,bgcolor:'#087b50',color:'#fff',borderRadius:1,fontSize:9}}>{page}</Typography><Button size="small" disabled={page===pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))} sx={{minWidth:24,width:24,p:0,color:'#637e71'}}><NavigateNextOutlinedIcon fontSize="small"/></Button></Box></Box>}
    </Box>
    <DeliveryPartnerDetailsDialog partner={selected} onClose={() => setSelected(null)} />
    <Dialog open={Boolean(resetTarget)} onClose={() => { if (!resetting) setResetTarget(null); }} fullWidth maxWidth="sm">
      <DialogTitle>Reset Delivery Partner password</DialogTitle>
      <DialogContent sx={{display:'grid',gap:2,pt:'12px !important'}}>
        <Typography>Set a new password for {resetTarget?.name || resetTarget?.username}. The account stays assigned to its current location and store.</Typography>
        {resetError && <Alert severity="error">{resetError}</Alert>}
        <PasswordField label="New password" autoComplete="new-password" value={resetPassword} onChange={(event)=>setResetPassword(event.target.value)} helperText="Use 8 to 100 characters." />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={resetPasswordConfirm} onChange={(event)=>setResetPasswordConfirm(event.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button disabled={resetting} onClick={()=>setResetTarget(null)}>Cancel</Button>
        <Button variant="contained" disabled={resetting||!resetPassword||!resetPasswordConfirm} onClick={submitPasswordReset}>{resetting?'Resetting...':'Reset password'}</Button>
      </DialogActions>
    </Dialog>
    {createOpen&&<Box role="dialog" aria-modal="true" aria-label="Create Delivery Partner" sx={{position:'fixed',inset:0,zIndex:1400,bgcolor:'rgba(15,23,42,.55)',display:'grid',placeItems:'center',p:2}}>
      <Box component="form" noValidate onSubmit={submit} sx={{width:'min(760px,100%)',maxHeight:'90vh',overflow:'auto',bgcolor:'white',borderRadius:2,p:3,display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2}}>
        <Typography variant="h6" sx={{gridColumn:'1 / -1'}}>Create Delivery Partner</Typography>
        {formError&&<Alert severity="error" sx={{gridColumn:'1 / -1'}}>{formError}</Alert>}
        {field('name','Name','text',true,180)}{field('username','Login username','text',true,190)}
        {field('email','Email','email',true,255)}{field('mobile','Mobile number','tel',true,30)}
        {field('password','Temporary password','password',true,100)}
        <TextField select fullWidth required label="Vehicle type" value={form.vehicleType} error={Boolean(fieldErrors.vehicleType)} helperText={fieldErrors.vehicleType} onChange={(event)=>setForm((current)=>({...current,vehicleType:event.target.value}))}>{['Bike','Scooter','Electric Bike','Van'].map((value)=><MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        {field('vehicleNumber','Vehicle number','text',true,40)}{field('licenceNumber','Licence number','text',true,60)}
        <TextField fullWidth label="Address" multiline minRows={2} value={form.address} slotProps={{htmlInput:{maxLength:700}}} error={Boolean(fieldErrors.address)} helperText={fieldErrors.address} onChange={(event)=>setForm((current)=>({...current,address:event.target.value}))}/>
        {role==='location-admin'&&<TextField select fullWidth required label="Store" value={form.storeId} error={Boolean(fieldErrors.storeId)} helperText={fieldErrors.storeId||`Only stores in ${location} already assigned within your managed location are available.`} onChange={(event)=>setForm((current)=>({...current,storeId:event.target.value}))}>{locationStores.map((store)=><MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>)}</TextField>}
        <FormControlLabel control={<Switch checked={form.active} onChange={(event)=>setForm((current)=>({...current,active:event.target.checked}))}/>} label={form.active?'Active':'Inactive'} sx={{gridColumn:'1 / -1'}}/>
        <Box sx={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end',gap:1}}><Button type="button" onClick={()=>setCreateOpen(false)} disabled={creating}>Cancel</Button><Button type="submit" variant="contained" disabled={creating}>{creating?'Creating...':'Create Delivery Partner'}</Button></Box>
      </Box>
    </Box>}
  </>;
}
