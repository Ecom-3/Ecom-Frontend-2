import { useMemo, useState } from 'react';
import { Avatar, Box, Button, Checkbox, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';

const normalize = (value) => String(value || '').trim().toLowerCase();
const Metric = ({ title, value, icon, tone, tint, footnote }) => <Box sx={{ minHeight: 72, p: 1.35, display: 'flex', alignItems: 'center', gap: 1.15, border: `1px solid ${tone}22`, borderRadius: 2, background: `linear-gradient(115deg,${tint},#fff)` }}><Box sx={{ width: 39, height: 39, borderRadius: 1.5, display: 'grid', placeItems: 'center', color: tone, bgcolor: `${tone}20`, '& svg': { fontSize: 21 } }}>{icon}</Box><Box><Typography variant="caption" fontWeight={700}>{title}</Typography><Typography fontSize={21} fontWeight={850} sx={{ lineHeight: 1.1 }}>{value}</Typography>{footnote&&<Typography variant="caption" color="success.dark">{footnote}</Typography>}</Box></Box>;

export default function AdminUsersPage({ records = [], locations = [], stores = [], onView, onEdit, onResetPassword, onDelete, onToggle, onCreate, onExport }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All Roles');
  const [location, setLocation] = useState('All Locations');
  const [store, setStore] = useState('All Stores');
  const [status, setStatus] = useState('All Status');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const pageSize = 10;
  const roleOptions = useMemo(() => ['All Roles', ...new Set(records.map((record) => record.role).filter(Boolean))], [records]);
  const locationOptions = useMemo(() => ['All Locations', ...new Set([...locations.map((item) => typeof item === 'string' ? item : item.name), ...records.map((record) => record.location)].filter(Boolean))], [locations, records]);
  const filtered = useMemo(() => records.filter((record) => {
    const search = normalize(query);
    const matchesQuery = !search || [record.name, record.email, record.username, record.mobile, record.role, record.location, record.store].some((value) => normalize(value).includes(search));
    const matchesRole = role === 'All Roles' || record.role === role;
    const matchesLocation = location === 'All Locations' || normalize(record.location) === normalize(location);
    const matchesStore = store === 'All Stores' || stores.some((item) => String(item.id) === store && (String(item.id) === String(record.storeId) || normalize(item.name) === normalize(record.store)));
    const matchesStatus = status === 'All Status' || normalize(record.status || 'Active') === normalize(status);
    return matchesQuery && matchesRole && matchesLocation && matchesStore && matchesStatus;
  }).sort((a, b) => sort === 'name' ? String(a.name || '').localeCompare(String(b.name || '')) : sort === 'oldest' ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [records, query, role, location, store, status, sort, stores]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeCount = records.filter((record) => normalize(record.status || 'Active') === 'active').length;
  const adminCount = records.filter((record) => ['global-admin', 'super-admin', 'location-admin'].includes(normalize(record.role))).length;
  const allVisibleSelected = visible.length > 0 && visible.every((record) => selected.includes(String(record.id)));
  const toggleAll = () => setSelected((current) => allVisibleSelected ? current.filter((id) => !visible.some((record) => String(record.id) === id)) : [...new Set([...current, ...visible.map((record) => String(record.id))])]);
  const resetPage = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const roleLabel = (value) => ({ 'global-admin': 'Global Admin', 'super-admin': 'Super Admin', 'location-admin': 'Location Admin', 'store-manager': 'Store Manager' }[normalize(value)] || value || 'User');
  const roleStyle = (value) => normalize(value).includes('admin') ? { color: '#8047d0', bgcolor: '#f1e8ff' } : { color: '#1169bd', bgcolor: '#e5f2ff' };

  return <Box sx={{ display: 'grid', gap: 1.25 }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 1.2, '@media(max-width:800px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }}>
      <Metric title="Total Users" value={records.length.toLocaleString('en-IN')} icon={<PeopleAltOutlinedIcon/>} tone="#159d52" tint="#effbf2" footnote="All account roles"/>
      <Metric title="Active Users" value={activeCount.toLocaleString('en-IN')} icon={<PersonOutlineOutlinedIcon/>} tone="#157bd3" tint="#eef7ff" footnote={`${records.length ? Math.round(activeCount / records.length * 100) : 0}% active`}/>
      <Metric title="Inactive Users" value={(records.length - activeCount).toLocaleString('en-IN')} icon={<PersonOutlineOutlinedIcon/>} tone="#e36f28" tint="#fff6ed" footnote="Accounts disabled"/>
      <Metric title="Admin Users" value={adminCount.toLocaleString('en-IN')} icon={<AdminPanelSettingsOutlinedIcon/>} tone="#7548d0" tint="#f4f0ff" footnote="Elevated access roles"/>
    </Box>
    <Box sx={{ p: 1.2, border: '1px solid #e1e9e5', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(12,66,48,.045)' }}>
      <Box sx={{ display: 'flex', gap: .8, alignItems: 'center', flexWrap: 'wrap', mb: 1.25 }}>
        <TextField size="small" placeholder="Search by name, email or phone..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}  sx={{ flex: '1 1 210px', '& .MuiInputBase-input': { py: 1.1, fontSize: 11 } }}/>
        <Select size="small" value={role} onChange={resetPage(setRole)} sx={{ minWidth: 115, fontSize: 11 }}>{roleOptions.map((item) => <MenuItem key={item} value={item}>{item === 'All Roles' ? item : roleLabel(item)}</MenuItem>)}</Select>
        <Select size="small" value={location} onChange={resetPage(setLocation)} sx={{ minWidth: 135, fontSize: 11 }}>{locationOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
        <Select size="small" value={store} onChange={resetPage(setStore)} sx={{ minWidth: 125, fontSize: 11 }}><MenuItem value="All Stores">All Stores</MenuItem>{stores.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}</Select>
        <Select size="small" value={status} onChange={resetPage(setStatus)} sx={{ minWidth: 112, fontSize: 11 }}><MenuItem value="All Status">All Status</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></Select>
        <Select size="small" value={sort} onChange={resetPage(setSort)} sx={{ minWidth: 100, fontSize: 11 }}><MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="name">Name</MenuItem></Select>
      </Box>
      <Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', minWidth: 850, borderCollapse: 'separate', borderSpacing: '0 3px', '& th': { p: .95, color: '#fff', textAlign: 'left', fontSize: 11, whiteSpace: 'nowrap', bgcolor: '#075b40' }, '& th:first-of-type': { borderRadius: '8px 0 0 8px' }, '& th:last-of-type': { borderRadius: '0 8px 8px 0' }, '& td': { px: .85, py: .8, borderBottom: '1px solid #edf1ef', fontSize: 10, verticalAlign: 'middle' } }}>
        <Box component="thead"><Box component="tr"><Box component="th" sx={{ width: 38 }}><Checkbox size="small" checked={allVisibleSelected} onChange={toggleAll} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}/></Box>{['User', 'Role', 'Location', 'Store', 'Status', 'Last Login', 'Actions'].map((heading) => <Box component="th" key={heading}>{heading}</Box>)}</Box></Box>
        <Box component="tbody">{visible.map((record) => <Box component="tr" key={record.id} sx={{ '&:hover': { bgcolor: '#f7fbf9' } }}>
          <Box component="td"><Checkbox size="small" checked={selected.includes(String(record.id))} onChange={() => setSelected((current) => current.includes(String(record.id)) ? current.filter((id) => id !== String(record.id)) : [...current, String(record.id)])}/></Box>
          <Box component="td" sx={{ minWidth: 220 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: .9 }}><Avatar sx={{ width: 29, height: 29, bgcolor: '#dff5e9', color: '#087451', fontSize: 12, fontWeight: 850 }}>{String(record.name || 'U').slice(0, 1).toUpperCase()}</Avatar><Box sx={{ minWidth: 0 }}><Typography fontWeight={800} fontSize={10} noWrap>{record.name || 'Unnamed user'}</Typography><Typography variant="caption" color="text.secondary" noWrap>{record.email || record.username || record.mobile || 'No contact details'}</Typography></Box></Box></Box>
          <Box component="td"><Chip size="small" icon={normalize(record.role).includes('admin') ? <AdminPanelSettingsOutlinedIcon/> : <StorefrontOutlinedIcon/>} label={roleLabel(record.role)} sx={{ height: 22, fontSize: 9, fontWeight: 800, ...roleStyle(record.role), '& .MuiChip-icon': { fontSize: 14, color: 'inherit' } }}/></Box>
          <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .4 }}><LocationOnOutlinedIcon sx={{ fontSize: 15 }}/><Typography variant="caption">{record.location || 'All Locations'}</Typography></Box></Box>
          <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .4 }}><StorefrontOutlinedIcon sx={{ fontSize: 15 }}/><Typography variant="caption">{record.store || 'All Stores'}</Typography></Box></Box>
          <Box component="td"><Chip size="small" label={record.status || 'Active'} sx={{ height: 20, fontSize: 9, fontWeight: 800, color: normalize(record.status || 'Active') === 'active' ? '#087443' : '#a45b00', bgcolor: normalize(record.status || 'Active') === 'active' ? '#e3f6e8' : '#fff0dc' }}/></Box>
          <Box component="td"><Typography variant="caption" color="text.secondary">{record.lastLogin || record.lastLoginAt || record.updatedAt || '—'}</Typography></Box>
          <Box component="td" sx={{ whiteSpace: 'nowrap' }}><Tooltip title="View"><IconButton size="small" onClick={() => onView(record)}><VisibilityOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip><Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(record)}><EditOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip>{onResetPassword&&<Tooltip title="Reset password"><IconButton size="small" onClick={() => onResetPassword(record)}><VpnKeyOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip>}<Tooltip title={normalize(record.status || 'Active') === 'active' ? 'Deactivate' : 'Activate'}><IconButton size="small" onClick={() => onToggle(record)}><MoreVertOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip>{onDelete&&<Button size="small" color="error" onClick={() => onDelete(record)} sx={{ minWidth: 0, fontSize: 9 }}>Delete</Button>}</Box>
        </Box>)}{!visible.length&&<Box component="tr"><Box component="td" colSpan={8} sx={{ py: 5, textAlign: 'center', color: '#6b7972' }}>No users match these filters.</Box></Box>}</Box>
      </Box></Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: .3 }}><Typography variant="caption" color="text.secondary">Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} users{selected.length ? ` · ${selected.length} selected` : ''}</Typography><Box sx={{ display: 'flex', alignItems: 'center' }}><IconButton size="small" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><KeyboardArrowLeftOutlinedIcon/></IconButton><Button size="small" sx={{ minWidth: 28, bgcolor: '#087451', color: '#fff' }}>{safePage}</Button><IconButton size="small" disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: .5 }}>{onExport&&<Button onClick={onExport}>Export</Button>}{onCreate&&<Button variant="contained" onClick={onCreate}>Create User</Button>}</Box>
    </Box>
  </Box>;
}
