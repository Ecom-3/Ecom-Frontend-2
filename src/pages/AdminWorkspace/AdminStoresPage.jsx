import { useMemo, useState } from 'react';
import { Box, Button, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage.jsx';
import { isGlobalStore } from '../../utils/storeDelivery.js';
import { openStreetMapEmbedUrl } from '../../services/openStreetMapService.js';

const normalize = (value) => String(value || '').trim().toLowerCase();
const GlobalStoreBadge = () => <Chip size="small" icon={<MapOutlinedIcon/>} label="Global" sx={{ height: 18, fontSize: 9, fontWeight: 850, color: '#815b13', bgcolor: '#fff1c9', border: '1px solid #d5a63a', '& .MuiChip-icon': { fontSize: 12, color: '#815b13' } }}/>;
const Metric = ({ title, value, icon, tone, tint, footnote }) => <Box sx={{ minHeight: 58, p: .9, display: 'flex', alignItems: 'center', gap: .9, border: `1px solid ${tone}22`, borderRadius: 1.2, background: `linear-gradient(115deg,${tint},#fff)` }}><Box sx={{ width: 32, height: 32, flex: '0 0 32px', borderRadius: 1, display: 'grid', placeItems: 'center', color: tone, bgcolor: `${tone}20`, '& svg': { fontSize: 20 } }}>{icon}</Box><Box><Typography variant="caption" fontWeight={700} sx={{ fontSize: 10 }}>{title}</Typography><Typography fontSize={18} fontWeight={850} sx={{ lineHeight: 1.05 }}>{value}</Typography>{footnote&&<Typography variant="caption" color="success.dark" sx={{ fontSize: 9 }}>{footnote}</Typography>}</Box></Box>;

export default function AdminStoresPage({ records = [], locations = [], onView, onEdit, onDelete, onToggle, onCreate, onExport }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('All Locations');
  const [status, setStatus] = useState('All Status');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [mapMode, setMapMode] = useState(false);
  const pageSize = 10;
  const locationOptions = useMemo(() => ['All Locations', ...new Set([...locations.map((item) => typeof item === 'string' ? item : item.name), ...records.map((record) => record.location)].filter(Boolean))], [locations, records]);
  const filtered = useMemo(() => records.filter((record) => {
    const search = normalize(query);
    const matchesSearch = !search || [record.name, record.location, record.address, record.city, record.pincode].some((value) => normalize(value).includes(search));
    const matchesLocation = location === 'All Locations' || normalize(record.location) === normalize(location);
    const matchesStatus = status === 'All Status' || normalize(record.status || 'Active') === normalize(status);
    return matchesSearch && matchesLocation && matchesStatus;
  }).sort((a, b) => sort === 'name' ? String(a.name || '').localeCompare(String(b.name || '')) : sort === 'oldest' ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [records, query, location, status, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const active = records.filter((record) => normalize(record.status || 'Active') === 'active').length;
  const globalCount = records.filter(isGlobalStore).length;
  const coordinates = filtered.filter((record) => Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude)));
  const mapUrl = coordinates.length ? openStreetMapEmbedUrl({ lat: Number(coordinates[0].latitude), lng: Number(coordinates[0].longitude), delta: .18 }) : '';

  const resetPage = (setter) => (event) => { setter(event.target.value); setPage(1); };

  return <Box className="admin-stores-page" sx={{ display: 'grid', gap: .9 }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: .9, '@media(max-width:800px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }}>
      <Metric title="Total Stores" value={records.length.toLocaleString('en-IN')} icon={<StorefrontOutlinedIcon/>} tone="#159c52" tint="#effbf2" footnote={globalCount ? `${globalCount} global store` : 'All assigned stores'}/>
      <Metric title="Locations" value={locationOptions.length - 1} icon={<LocationOnOutlinedIcon/>} tone="#147bd5" tint="#eff7ff" footnote="Store areas"/>
      <Metric title="Active Stores" value={active.toLocaleString('en-IN')} icon={<Inventory2OutlinedIcon/>} tone="#7650cf" tint="#f5f1ff" footnote={`${records.length ? Math.round(active / records.length * 100) : 0}% active`}/>
      <Metric title="Inactive Stores" value={(records.length - active).toLocaleString('en-IN')} icon={<PowerSettingsNewOutlinedIcon/>} tone="#e36f29" tint="#fff5ee" footnote="Unavailable stores"/>
    </Box>
    <Box sx={{ p: .9, border: '1px solid #e1e9e5', borderRadius: 1.2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(12,66,48,.045)' }}>
      <Box sx={{ display: 'flex', gap: .65, alignItems: 'center', flexWrap: 'wrap', mb: .8 }}>
        <TextField size="small" placeholder="Search by store name, location or city..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}  sx={{ flex: '1 1 240px', '& .MuiInputBase-root': { height: 32 }, '& .MuiInputBase-input': { py: .5, fontSize: 10 } }}/>
        <Select size="small" value={location} onChange={resetPage(setLocation)} sx={{ minWidth: 125, height: 32, fontSize: 10 }}>{locationOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
        <Select size="small" value={status} onChange={resetPage(setStatus)} sx={{ minWidth: 102, height: 32, fontSize: 10 }}><MenuItem value="All Status">All Status</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></Select>
        <Select size="small" value={sort} onChange={resetPage(setSort)} sx={{ minWidth: 90, height: 32, fontSize: 10 }}><MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="name">Name</MenuItem></Select>
        <Tooltip title={mapMode ? 'Show list' : 'Show store map'}><IconButton onClick={() => setMapMode((value) => !value)} sx={{ width: 32, height: 32, p: 0, color: '#075f43', bgcolor: mapMode ? '#087451' : '#edf7f2', '&:hover': { bgcolor: '#087451', color: '#fff' }, '& svg': { fontSize: 17 } }}>{mapMode ? <MapOutlinedIcon fontSize="small"/> : <FormatListBulletedOutlinedIcon fontSize="small"/>}</IconButton></Tooltip>
      </Box>
      {mapMode ? <Box sx={{ height: 390, overflow: 'hidden', border: '1px solid #e3ece7', borderRadius: 1.5 }}>{mapUrl ? <iframe title="Store locations map" src={mapUrl} style={{ width: '100%', height: '100%', border: 0 }}/> : <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64756d' }}>Add coordinates to stores to show them on the map.</Box>}</Box> : <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', minWidth: 980, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '0 3px', '& th': { p: .65, color: '#fff', textAlign: 'left', fontSize: 10, whiteSpace: 'nowrap', bgcolor: '#075b40' }, '& th:first-of-type': { borderRadius: '5px 0 0 5px' }, '& th:last-of-type': { borderRadius: '0 5px 5px 0' }, '& td': { px: .65, py: .55, borderBottom: '1px solid #edf1ef', fontSize: 9, verticalAlign: 'middle' }, '& th:nth-of-type(1), & td:nth-of-type(1)': { width: '20%' }, '& th:nth-of-type(2), & td:nth-of-type(2)': { width: '14%' }, '& th:nth-of-type(3), & td:nth-of-type(3)': { width: '33%' }, '& th:nth-of-type(4), & td:nth-of-type(4)': { width: '7%' }, '& th:nth-of-type(5), & td:nth-of-type(5)': { width: '10%' }, '& th:nth-of-type(6), & td:nth-of-type(6)': { width: '16%' } }}>
          <Box component="thead"><Box component="tr">{['Store Name', 'Location', 'Address', 'Status', 'Created On', 'Actions'].map((heading) => <Box component="th" key={heading}>{heading}</Box>)}</Box></Box>
          <Box component="tbody">{visible.map((record) => {
            const global = isGlobalStore(record);
            const activeStatus = normalize(record.status || 'Active') === 'active';
            return <Box component="tr" key={record.id} sx={{ bgcolor: global ? '#fffaf0' : '#fff', outline: global ? '2px solid #d3a334' : 'none', outlineOffset: global ? '-2px' : undefined, '&:hover': { bgcolor: global ? '#fff5dd' : '#f7fbf9' } }}>
              
              <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .75, minWidth: 0 }}><SafeProductImage src={record.image || record.logoUrl || record.thumbnailUrl} alt="" style={{ width: 32, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0, background: '#edf4f0', border: global ? '1px solid #d3a334' : undefined }}/><Box sx={{ minWidth: 0, overflow: 'hidden' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: .4, minWidth: 0 }}><Typography fontSize={9} fontWeight={850} sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.25 }}>{record.name || 'Unnamed store'}</Typography>{global&&<GlobalStoreBadge/>}</Box><Typography variant="caption" color="text.secondary" sx={{ fontSize: 8 }}>{global ? 'Global distribution store' : record.type || 'Store'}</Typography></Box></Box></Box>
              <Box component="td"><Chip size="small" icon={<LocationOnOutlinedIcon/>} label={record.location || (global ? 'India' : 'Unassigned')} sx={{ maxWidth: '100%', height: 19, fontSize: 8, fontWeight: 750, color: global ? '#835c13' : '#087443', bgcolor: global ? '#fff1cc' : '#e6f6eb', border: global ? '1px solid #dfba61' : undefined, '& .MuiChip-icon': { fontSize: 12, color: 'inherit' }, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}/></Box>
              <Box component="td" sx={{ overflowWrap: 'anywhere' }}><Typography fontSize={10} fontWeight={650} sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{record.address || (global ? 'Nationwide distribution' : 'Address not set')}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{[record.city, record.state, record.pincode].filter(Boolean).join(', ') || '—'}</Typography></Box>
              <Box component="td"><Chip size="small" label={record.status || 'Active'} sx={{ height: 18, fontSize: 8, fontWeight: 800, color: activeStatus ? '#087443' : '#a45b00', bgcolor: activeStatus ? '#e3f6e8' : '#fff0dc' }}/></Box>
              <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}><CalendarMonthOutlinedIcon sx={{ fontSize: 16 }}/><Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>{record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-IN') : '—'}</Typography></Box></Box>
              <Box component="td" sx={{ whiteSpace: 'nowrap', '& .MuiIconButton-root': { p: .15 } }}><Tooltip title="View store"><IconButton size="small" onClick={() => onView(record)}><VisibilityOutlinedIcon sx={{ fontSize: 14 }}/></IconButton></Tooltip>{!global&&<Tooltip title="Edit store"><IconButton size="small" onClick={() => onEdit(record)}><EditOutlinedIcon sx={{ fontSize: 14 }}/></IconButton></Tooltip>}<Tooltip title={activeStatus ? 'Deactivate' : 'Activate'}><IconButton size="small" onClick={() => onToggle(record)} sx={{ color: activeStatus ? '#087451' : '#16854c' }}><PowerSettingsNewOutlinedIcon sx={{ fontSize: 14 }}/></IconButton></Tooltip>{!global&&<Tooltip title="Delete store"><IconButton size="small" onClick={() => onDelete(record)} sx={{ color: '#c73d40', bgcolor: '#fff0f0' }}><DeleteOutlineOutlinedIcon sx={{ fontSize: 14 }}/></IconButton></Tooltip>}</Box>
            </Box>;
          })}{!visible.length&&<Box component="tr"><Box component="td" colSpan={6} sx={{ py: 5, textAlign: 'center', color: '#68776f' }}>No stores match these filters.</Box></Box>}</Box>
        </Box>
      </Box>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: .3 }}><Typography variant="caption" color="text.secondary">Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} stores</Typography><Box sx={{ display: 'flex', alignItems: 'center' }}><IconButton size="small" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><KeyboardArrowLeftOutlinedIcon/></IconButton><Button size="small" sx={{ minWidth: 28, bgcolor: '#087451', color: '#fff' }}>{safePage}</Button><IconButton size="small" disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: .5 }}>{onExport&&<Button onClick={onExport}>Export</Button>}{onCreate&&<Button variant="contained" onClick={onCreate}>Create Store</Button>}</Box>
    </Box>
  </Box>;
}
