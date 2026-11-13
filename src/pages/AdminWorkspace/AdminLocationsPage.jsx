import { useMemo, useState } from 'react';
import { Box, Button, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage.jsx';
import { openStreetMapEmbedUrl, openStreetMapLocationUrl } from '../../services/openStreetMapService.js';

const normalize = (value) => String(value || '').trim().toLowerCase();
const Metric = ({ title, value, icon, tone, tint, footnote }) => <Box sx={{ minHeight: 74, p: 1.4, display: 'flex', alignItems: 'center', gap: 1.2, border: `1px solid ${tone}22`, borderRadius: 2, background: `linear-gradient(115deg,${tint},#fff)` }}><Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'grid', placeItems: 'center', color: tone, bgcolor: `${tone}20`, '& svg': { fontSize: 21 } }}>{icon}</Box><Box><Typography variant="caption" fontWeight={700}>{title}</Typography><Typography fontSize={21} fontWeight={850} sx={{ lineHeight: 1.15 }}>{value}</Typography>{footnote&&<Typography variant="caption" color="success.dark">{footnote}</Typography>}</Box></Box>;

export default function AdminLocationsPage({ records = [], stores = [], products = [], orders = [], onView, onEdit, onCreate, onExport }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All Cities');
  const [storeFilter, setStoreFilter] = useState('All Stores');
  const [status, setStatus] = useState('All Status');
  const [page, setPage] = useState(1);
  const [mapMode, setMapMode] = useState(false);
  const pageSize = 8;
  const cities = useMemo(() => ['All Cities', ...new Set(records.map((record) => record.city || record.name).filter(Boolean))], [records]);
  const filtered = useMemo(() => records.filter((record) => {
    const search = normalize(query);
    const matchesSearch = !search || [record.name, record.city, record.address, record.pincode, record.code].some((value) => normalize(value).includes(search));
    const matchesCity = city === 'All Cities' || (record.city || record.name) === city;
    const matchesStatus = status === 'All Status' || normalize(record.status) === normalize(status);
    const locationStores = stores.filter((store) => normalize(store.location) === normalize(record.name));
    const matchesStore = storeFilter === 'All Stores' || locationStores.some((store) => String(store.id) === storeFilter);
    return matchesSearch && matchesCity && matchesStatus && matchesStore;
  }), [records, stores, query, city, storeFilter, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const active = records.filter((record) => normalize(record.status) === 'active').length;
  const mapLocations = filtered.filter((record) => Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude)));
  const firstMapLocation = mapLocations[0];
  const mapUrl = firstMapLocation ? openStreetMapEmbedUrl({ lat: Number(firstMapLocation.latitude), lng: Number(firstMapLocation.longitude), delta: .15 }) : '';
  const locationOrders = (record) => orders.filter((order) => normalize(order.location || order.city).includes(normalize(record.name))).length;
  const storesFor = (record) => stores.filter((store) => normalize(store.location) === normalize(record.name));
  const productsFor = (record) => {
    const linkedStores = new Set(storesFor(record).map((store) => String(store.id)));
    return products.filter((product) => product.storeId && linkedStores.has(String(product.storeId))).length;
  };

  return <Box sx={{ display: 'grid', gap: 1.25 }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 1.2, '@media(max-width:900px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }}>
      <Metric title="Total Locations" value={records.length.toLocaleString('en-IN')} icon={<LocationOnOutlinedIcon/>} tone="#149b50" tint="#edfbf2" footnote="Assigned business areas"/>
      <Metric title="Total Stores" value={stores.length.toLocaleString('en-IN')} icon={<StorefrontOutlinedIcon/>} tone="#1478d4" tint="#eef7ff" footnote="Across all locations"/>
      <Metric title="Total Products" value={products.length.toLocaleString('en-IN')} icon={<Inventory2OutlinedIcon/>} tone="#7651d8" tint="#f5f1ff" footnote="Catalog products"/>
      <Metric title="Active Locations" value={active.toLocaleString('en-IN')} icon={<MapOutlinedIcon/>} tone="#df7924" tint="#fff6ec" footnote={records.length ? `${Math.round(active / records.length * 100)}% active` : '0% active'}/>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.7fr) minmax(250px,.9fr)', gap: 1.2, '@media(max-width:1000px)': { gridTemplateColumns: '1fr' } }}>
      <Box sx={{ minWidth: 0, p: 1.2, border: '1px solid #e1e9e5', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(12,66,48,.045)' }}>
        <Box sx={{ display: 'flex', gap: .8, flexWrap: 'wrap', mb: 1.25, alignItems: 'center' }}>
          <TextField size="small" placeholder="Search by location name, city or PIN..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}  sx={{ flex: '1 1 220px', '& .MuiInputBase-input': { fontSize: 11, py: 1.1 } }}/>
          <Select size="small" value={city} onChange={(event) => { setCity(event.target.value); setPage(1); }} sx={{ minWidth: 120, fontSize: 11 }} >{cities.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
          <Select size="small" value={storeFilter} onChange={(event) => { setStoreFilter(event.target.value); setPage(1); }} sx={{ minWidth: 120, fontSize: 11 }}><MenuItem value="All Stores">All Stores</MenuItem>{stores.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</Select>
          <Select size="small" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} sx={{ minWidth: 115, fontSize: 11 }}><MenuItem value="All Status">All Status</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></Select>
          <Tooltip title={mapMode ? 'Show table' : 'Show map'}><IconButton onClick={() => setMapMode((value) => !value)} sx={{ borderRadius: 1, color: '#075f43', bgcolor: mapMode ? '#087451' : '#edf7f2', '&:hover': { bgcolor: '#087451', color: '#fff' } }}>{mapMode ? <MapOutlinedIcon fontSize="small"/> : <FormatListBulletedOutlinedIcon fontSize="small"/>}</IconButton></Tooltip>
        </Box>
        {mapMode ? <Box sx={{ height: 390, overflow: 'hidden', borderRadius: 1.5, border: '1px solid #e3ece7' }}>{mapUrl ? <iframe title="Locations map" src={mapUrl} style={{ width: '100%', height: '100%', border: 0 }}/> : <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: '#61736a' }}>Add coordinates to locations to show them on the map.</Box>}</Box> : <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', minWidth: 760, borderCollapse: 'separate', borderSpacing: '0 3px', '& th': { p: .9, color: '#fff', textAlign: 'left', fontSize: 10, whiteSpace: 'nowrap', bgcolor: '#075b40' }, '& th:first-of-type': { borderRadius: '8px 0 0 8px' }, '& th:last-of-type': { borderRadius: '0 8px 8px 0' }, '& td': { px: .8, py: .55, borderBottom: '1px solid #edf1ef', fontSize: 10, verticalAlign: 'middle' } }}>
            <Box component="thead"><Box component="tr">{['#', 'Location Name', 'Address / City', 'Stores', 'Products', 'Orders (30d)', 'Status', 'Actions'].map((heading) => <Box component="th" key={heading}>{heading}</Box>)}</Box></Box>
            <Box component="tbody">{visible.map((record, index) => <Box component="tr" key={record.id} sx={{ '&:hover': { bgcolor: '#f6faf8' } }}>
              <Box component="td" sx={{ fontWeight: 800 }}>{(Math.min(page, pages) - 1) * pageSize + index + 1}</Box>
              <Box component="td" sx={{ minWidth: 150 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: .8 }}><SafeProductImage src={record.image || record.thumbnailUrl} alt="" style={{ width: 34, height: 30, objectFit: 'cover', borderRadius: 5, background: '#eef4f1' }}/><Typography fontSize={10} fontWeight={800} noWrap>{record.name || 'Unnamed location'}</Typography></Box></Box>
              <Box component="td" sx={{ minWidth: 185 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: .4 }}><LocationOnOutlinedIcon sx={{ fontSize: 14, color: '#284a3a' }}/><Typography variant="caption" noWrap>{[record.address || record.city, record.pincode].filter(Boolean).join(', ') || 'Address not set'}</Typography></Box></Box>
              <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .45 }}><StorefrontOutlinedIcon sx={{ color: '#087451', fontSize: 14 }}/>{storesFor(record).length}</Box></Box>
              <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .45 }}><Inventory2OutlinedIcon sx={{ color: '#087451', fontSize: 14 }}/>{productsFor(record)}</Box></Box>
              <Box component="td"><Typography fontSize={10} fontWeight={700}>{locationOrders(record)}</Typography></Box>
              <Box component="td"><Chip size="small" label={record.status || 'Active'} sx={{ height: 21, fontSize: 9, fontWeight: 800, color: normalize(record.status) === 'inactive' ? '#a45b00' : '#087443', bgcolor: normalize(record.status) === 'inactive' ? '#fff0dc' : '#e5f6e9' }}/></Box>
              <Box component="td" sx={{ whiteSpace: 'nowrap' }}><Tooltip title="View location"><IconButton size="small" onClick={() => onView(record)}><VisibilityOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip><Tooltip title="Edit location"><IconButton size="small" onClick={() => onEdit(record)}><EditOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip><Tooltip title="Open map"><IconButton size="small" disabled={!Number.isFinite(Number(record.latitude)) || !Number.isFinite(Number(record.longitude))} component="a" href={Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude)) ? openStreetMapLocationUrl({ lat: record.latitude, lng: record.longitude }) : undefined} target="_blank" rel="noreferrer"><MoreVertOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip></Box>
            </Box>)}{!visible.length&&<Box component="tr"><Box component="td" colSpan={8} sx={{ py: 5, textAlign: 'center', color: '#6b7972' }}>No locations match these filters.</Box></Box>}</Box>
          </Box>
        </Box>}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: .3 }}><Typography variant="caption" color="text.secondary">Showing {filtered.length ? (Math.min(page, pages) - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} locations</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: .4 }}><IconButton size="small" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><KeyboardArrowLeftOutlinedIcon/></IconButton><Button size="small" sx={{ minWidth: 28, color: '#fff', bgcolor: '#087451' }}>{Math.min(page, pages)}</Button><IconButton size="small" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
      </Box>
      <Box sx={{ minWidth: 0, p: 1.4, border: '1px solid #e1e9e5', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(12,66,48,.045)' }}>
        <Typography fontWeight={850} fontSize={14} mb={1}>Location Distribution</Typography>
        <Box sx={{ height: 195, position: 'relative', overflow: 'hidden', borderRadius: 1.5, bgcolor: '#eff5f1' }}>{mapUrl ? <iframe title="Location distribution map" src={mapUrl} style={{ width: '100%', height: '100%', border: 0 }}/> : <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: '#61736a', fontSize: 12 }}>Location coordinates will appear here.</Box>}<Typography sx={{ position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)', bgcolor: '#fff', px: 1, py: .25, borderRadius: 1, fontSize: 11, fontWeight: 850 }}>{firstMapLocation?.city || firstMapLocation?.name || 'Locations'}</Typography></Box>
        <Typography fontWeight={800} fontSize={12} mt={1.5} mb={.5}>Top Locations by Orders (30d)</Typography>
        {[...records].sort((a, b) => locationOrders(b) - locationOrders(a)).slice(0, 3).map((record, index) => <Box key={record.id} sx={{ display: 'flex', alignItems: 'center', gap: .8, py: .8, borderTop: '1px solid #edf1ef' }}><Chip size="small" label={index + 1} sx={{ width: 22, height: 22, borderRadius: '50%', fontWeight: 850, color: '#895500', bgcolor: '#fff1ca' }}/><Typography fontSize={10} fontWeight={750} noWrap sx={{ flex: 1 }}>{record.name}</Typography><Chip size="small" label={`${locationOrders(record)} orders`} sx={{ height: 20, fontSize: 9, color: '#087443', bgcolor: '#e5f6e9', fontWeight: 800 }}/></Box>)}
        {onCreate&&<Button fullWidth variant="contained" onClick={onCreate} sx={{ mt: 1.1 }}>Create Location</Button>}
        {onExport&&<Button fullWidth onClick={onExport} sx={{ mt: .4 }}>Export Locations</Button>}
      </Box>
    </Box>
  </Box>;
}
