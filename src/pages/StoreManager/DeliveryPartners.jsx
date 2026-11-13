import { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Switch, TextField, Typography } from '@mui/material';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import NavigateBeforeOutlinedIcon from '@mui/icons-material/NavigateBeforeOutlined';
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined';
import { createDeliveryPartner, getDeliveryPartners, setDeliveryPartnerActive } from '../../services/deliveryPartnerApi';
import DeliveryPartnerDetailsDialog from '../../components/DeliveryPartnerDetailsDialog.jsx';
import PasswordField from '../../components/PasswordField.jsx';
import './DeliveryPartners.css';

const initial = { name: '', mobile: '', username: '', email: '', password: '', vehicleType: 'Bike', vehicleNumber: '', licenceNumber: '', address: '', active: true };
const fields = [
  ['name', 'Name', 'text', 180], ['mobile', 'Mobile number', 'tel', 30],
  ['username', 'Login username', 'text', 190], ['email', 'Email', 'email', 255],
  ['password', 'Password', 'password', 100], ['vehicleType', 'Vehicle type', 'text', 40],
  ['vehicleNumber', 'Bike / vehicle number', 'text', 40], ['licenceNumber', 'Licence number', 'text', 60],
  ['address', 'Address', 'text', 700],
];
const PartnerBikeLogo = ({ size = 42 }) => <Box sx={{ width: size, height: size, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#e7f8ed', color: '#07864c', flex: 'none' }}><svg width={size * .72} height={size * .72} viewBox="0 0 64 64" role="img" aria-label="Delivery partner on a bike"><circle cx="17" cy="47" r="9" fill="none" stroke="#087d49" strokeWidth="3"/><circle cx="49" cy="47" r="9" fill="none" stroke="#087d49" strokeWidth="3"/><path d="M17 47l11-18 10 18H17l9-12h14l9 12M37 25l6-5 6 2" fill="none" stroke="#087d49" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="34" cy="12" r="6" fill="#f0a163"/><path d="M28 12c0-7 12-9 14-1l-4 2-5-3-5 4z" fill="#16a34a"/><path d="M31 19l-6 8 9 5 7-9-5-4z" fill="#16a34a"/><path d="M29 23l-8 7 3 3 10-6m4-3 8 5" fill="none" stroke="#f0a163" strokeWidth="4" strokeLinecap="round"/></svg></Box>;
export default function DeliveryPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const load = async () => {
    setLoading(true); setError('');
    try { setPartners(await getDeliveryPartners()); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let ignore = false;
    getDeliveryPartners().then(rows => { if (!ignore) setPartners(rows); })
      .catch(reason => { if (!ignore) setError(reason.message); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);
  const create = async (event) => {
    event.preventDefault(); setBusy('create'); setFormError('');
    try {
      const saved = await createDeliveryPartner(form);
      setPartners(current => [...current, saved].sort((a,b) => a.name.localeCompare(b.name)));
      setOpen(false); setForm(initial);
    } catch (reason) { setFormError(reason.message); }
    finally { setBusy(''); }
  };
  const toggle = async (partner, active) => {
    setBusy(partner.id); setError('');
    try {
      const saved = await setDeliveryPartnerActive(partner.id, active);
      setPartners(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (reason) { setError(reason.message); }
    finally { setBusy(''); }
  };
  const regions = useMemo(() => [...new Set(partners.map((partner) => String(partner.location || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())).filter(Boolean))].sort(), [partners]);
  const filtered = useMemo(() => partners.filter((partner) => {
    const active = partner.status === 'Active';
    if (statusFilter === 'active' && !active) return false;
    if (statusFilter === 'inactive' && active) return false;
    const region = String(partner.location || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    if (regionFilter !== 'all' && region !== regionFilter) return false;
    const term = query.trim().toLowerCase();
    return !term || [partner.name, partner.mobile, partner.email, partner.username, partner.vehicleNumber, partner.licenceNumber, partner.address, partner.storeLocation, region].some((value) => String(value || '').toLowerCase().includes(term));
  }), [partners, statusFilter, regionFilter, query]);
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePartners = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = partners.filter((partner) => partner.status === 'Active').length;
  const bikeCount = partners.filter((partner) => /bike|scooter/i.test(partner.vehicleType || '')).length;
  return <>
    <Box className="sm-delivery-page">
    <Box className="sm-delivery-heading"><Box sx={{display:'flex',alignItems:'center',gap:1.5}}><Box className="sm-delivery-heading-icon"><TwoWheelerOutlinedIcon/></Box><Box><Typography variant="h4">Delivery Partners</Typography><Typography>Manage your store's delivery partners, vehicle details, and service area.</Typography></Box></Box><Box className="sm-delivery-heading-actions"><Chip label={`${activeCount}/${partners.length} Active`} /><Button variant="contained" onClick={() => { setForm(initial); setFormError(''); setOpen(true); }}>+ &nbsp; Create Delivery Partner</Button></Box></Box>
    {error && <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>}
    <Box className="sm-delivery-stats">{[
      ['Total Partners', partners.length, 'All delivery partners', <PeopleAltOutlinedIcon/>, '#0eaa4d', '#e8f8eb'],
      ['Active Partners', activeCount, 'Currently delivering', <CheckCircleOutlineOutlinedIcon/>, '#0baa46', '#e6f8e8'],
      ['Inactive Partners', partners.length-activeCount, 'Not available', <ScheduleOutlinedIcon/>, '#923cf1', '#f5eaff'],
      ['Bike Partners', bikeCount, 'Partners with bike', <TwoWheelerOutlinedIcon/>, '#1488f7', '#e9f4ff'],
    ].map(([label,value,caption,icon,color,tint])=><Box className="sm-delivery-stat" key={label} sx={{'--stat-color':color,'--stat-tint':tint}}><Box>{icon}</Box><section><small>{label}</small><strong>{loading?'—':value}</strong><em>{caption}</em></section></Box>)}</Box>
    <Box className="sm-delivery-tools"><TextField size="small" placeholder="Search by name, phone, email, username, or vehicle number..." value={query} onChange={(event)=>{setQuery(event.target.value);setPage(1);}} InputProps={{startAdornment:<SearchOutlinedIcon sx={{mr:1,color:'#17263d'}}/>}}/><TextField select size="small" value={statusFilter} onChange={(event)=>{setStatusFilter(event.target.value);setPage(1);}}><MenuItem value="all">All Status</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField><TextField select size="small" value={regionFilter} onChange={(event)=>{setRegionFilter(event.target.value);setPage(1);}}><MenuItem value="all">All Service Regions</MenuItem>{regions.map(region=><MenuItem key={region} value={region}>{region}</MenuItem>)}</TextField><Button onClick={()=>{setQuery('');setStatusFilter('all');setRegionFilter('all');setPage(1);load();}}>Refresh</Button></Box>
    {loading ? <Typography>Loading delivery partners...</Typography> : <Box className="sm-delivery-list">
      {visiblePartners.map(partner => <Box className="sm-delivery-card" key={partner.id}>
        <PartnerBikeLogo size={82}/>
        <Box className="sm-delivery-contact"><Box className="sm-delivery-name"><strong>{partner.name || 'Delivery Partner'}</strong><Chip label={partner.status || 'Unknown'} size="small"/></Box><span><PhoneOutlinedIcon/>{partner.mobile || 'Phone not recorded'}</span><span><MailOutlineOutlinedIcon/>{partner.email || 'Email not recorded'}</span><span><PersonOutlineOutlinedIcon/>Username: {partner.username || 'Not recorded'}</span><span><LocationOnOutlinedIcon/>{partner.address || 'Address not recorded'}</span></Box>
        <Box className="sm-delivery-vehicle"><span><TwoWheelerOutlinedIcon/>{partner.vehicleType || 'Bike'}</span><span><BadgeOutlinedIcon/>Bike / Vehicle: {partner.vehicleNumber || 'Not recorded'}</span><span><BadgeOutlinedIcon/>Licence: {partner.licenceNumber || 'Not recorded'}</span><span><StorefrontOutlinedIcon/>Store Location: {partner.storeLocation || 'Not recorded'}</span><span><LocationOnOutlinedIcon/>Service Region: {partner.location ? String(partner.location).replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not assigned'}</span></Box>
        <Box className="sm-delivery-actions"><Button startIcon={<VisibilityOutlinedIcon/>} onClick={()=>setSelectedPartner(partner)}>View Full Details</Button><Button variant="outlined" startIcon={<EditOutlinedIcon/>} onClick={()=>setSelectedPartner(partner)}>Edit</Button><FormControlLabel label={partner.status || 'Inactive'} control={<Switch checked={partner.status === 'Active'} disabled={Boolean(busy)} onChange={(_, active) => toggle(partner, active)} slotProps={{ input: { 'aria-label': `Active status for ${partner.name}` } }} />} /></Box>
      </Box>)}
      {!filtered.length && !error && <Typography>No delivery partners match these filters.</Typography>}
      <Box className="sm-delivery-pagination"><Typography>Showing {filtered.length ? (page-1)*pageSize+1 : 0} – {Math.min(page*pageSize,filtered.length)} of {filtered.length} delivery partners</Typography><Box><Button disabled={page===1} onClick={()=>setPage((value)=>Math.max(1,value-1))}><NavigateBeforeOutlinedIcon/></Button><strong>{page}</strong><Button disabled={page===pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))}><NavigateNextOutlinedIcon/></Button></Box></Box>
    </Box>}
    </Box>
    <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="md">
      <Box component="form" onSubmit={create}>
        <DialogTitle>Create Delivery Partner</DialogTitle>
        <DialogContent><Typography mb={2}>The partner will be assigned to your store automatically.</Typography>{formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 1 }}>
            {fields.map(([key,label,type,maxLength]) => type === 'password' ? <PasswordField key={key} label={label} required={key !== 'address'} value={form[key]} disabled={Boolean(busy)} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} inputProps={{ maxLength, minLength: 8 }} autoComplete="new-password" /> : <TextField key={key} label={label} type={type} required={key !== 'address'} value={form[key]} disabled={Boolean(busy)} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} slotProps={{ htmlInput: { maxLength, ...(key === 'mobile' ? { pattern: '[+0-9 ()\\-]{7,30}' } : {}) } }} autoComplete="off" />)}
            <FormControlLabel label={form.active ? 'Active' : 'Inactive'} control={<Switch checked={form.active} disabled={Boolean(busy)} onChange={(_,active) => setForm(current => ({ ...current, active }))} />} />
          </Box>
        </DialogContent>
        <DialogActions><Button disabled={Boolean(busy)} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={Boolean(busy)}>{busy === 'create' ? 'Saving...' : 'Create Delivery Partner'}</Button></DialogActions>
      </Box>
    </Dialog>
    <DeliveryPartnerDetailsDialog partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
  </>;
}
