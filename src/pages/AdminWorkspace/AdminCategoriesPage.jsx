import { useCallback, useMemo, useState } from 'react';
import { Box, Button, Checkbox, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage.jsx';
import { categoryImageFor } from '../../services/categoryImages.js';

const normalize = (value) => String(value || '').trim().toLowerCase();
const Stat = ({ title, value, icon, color, tint }) => <Box sx={{ minWidth: 0, minHeight: 58, p: 1, display: 'flex', alignItems: 'center', gap: 1, border: `1px solid ${color}22`, borderRadius: 2, background: `linear-gradient(115deg,${tint},#fff)` }}><Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: 1.5, display: 'grid', placeItems: 'center', color, bgcolor: `${color}20`, '& svg': { fontSize: 19 } }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography fontSize={16} fontWeight={850} sx={{ lineHeight: 1.15 }}>{value}</Typography><Typography variant="caption" fontSize={10} color="text.secondary">{title}</Typography></Box></Box>;

export default function AdminCategoriesPage({ records = [], products = [], stores = [], mappings = [], onView, onEdit, onToggle, onDelete, onCreate, onExport }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All Status');
  const [storeFilter, setStoreFilter] = useState('All Stores');
  const [location, setLocation] = useState('All Locations');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [grid, setGrid] = useState(false);
  const pageSize = 6;
  const locations = useMemo(() => ['All Locations', ...new Set(stores.map((store) => store.location).filter(Boolean))], [stores]);
  const totalLocations = Math.max(0, locations.length - 1);
  const categoryProducts = useCallback((category) => products.filter((product) => normalize(typeof product.category === 'object' ? product.category?.name : (product.categoryName || product.category)) === normalize(category.name)), [products]);
  const productStores = useCallback((category) => {
    const productIds = new Set(categoryProducts(category).map((product) => String(product.id || product.productId)));
    return mappings.filter((mapping) => productIds.has(String(mapping.productId || mapping.product?.id)) && mapping.available !== false);
  }, [categoryProducts, mappings]);
  const filtered = useMemo(() => records.filter((record) => {
    const search = normalize(query);
    const matchesQuery = !search || [record.name, record.description, record.slug].some((value) => normalize(value).includes(search));
    const matchesStatus = status === 'All Status' || normalize(record.status || 'Active') === normalize(status);
    const usedStoreLinks = productStores(record);
    const matchesStore = storeFilter === 'All Stores' || usedStoreLinks.some((mapping) => String(mapping.storeId || mapping.store?.id) === storeFilter);
    const matchesLocation = location === 'All Locations' || usedStoreLinks.some((mapping) => { const store = stores.find((item) => String(item.id) === String(mapping.storeId || mapping.store?.id)); return normalize(store?.location) === normalize(location); });
    return matchesQuery && matchesStatus && matchesStore && matchesLocation;
  }).sort((a, b) => sort === 'name' ? String(a.name || '').localeCompare(String(b.name || '')) : sort === 'oldest' ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [records, query, status, storeFilter, location, sort, stores, productStores]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((record) => selected.includes(String(record.id)));
  const toggleAll = () => setSelected((current) => allVisibleSelected ? current.filter((id) => !visible.some((record) => String(record.id) === id)) : [...new Set([...current, ...visible.map((record) => String(record.id))])]);
  const resetPage = (setter) => (event) => { setter(event.target.value); setPage(1); };

  return <Box sx={{ display: 'grid', gap: 1.2 }}>
    <Box className="admin-categories-hero" sx={{display:'grid',gap:1.1}}>
      <Box sx={{display:'flex',alignItems:'center',gap:1.2,p:1.1,borderRadius:2,bgcolor:'#fff',background:'linear-gradient(105deg,#eaf8f2,#fff 58%,#fff8ed)',border:'1px solid #d9eee5'}}><Box sx={{width:42,height:42,flexShrink:0,borderRadius:'50%',bgcolor:'#d8f3e5',color:'#087451',display:'grid',placeItems:'center'}}><CategoryOutlinedIcon/></Box><Box><Typography fontSize={21} fontWeight={850} lineHeight={1.2}>Categories</Typography><Typography variant="caption" color="text.secondary">Manage your product categories</Typography></Box></Box>
      <Box sx={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:1,'@media(max-width:800px)':{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}}>
        <Stat title="Total Categories" value={records.length.toLocaleString('en-IN')} icon={<CategoryOutlinedIcon/>} color="#149d51" tint="#effbf2"/>
        <Stat title="Products in Categories" value={products.length.toLocaleString('en-IN')} icon={<Inventory2OutlinedIcon/>} color="#176ed1" tint="#eef6ff"/>
        <Stat title="In Stores" value={stores.length.toLocaleString('en-IN')} icon={<StorefrontOutlinedIcon/>} color="#784fd0" tint="#f4f0ff"/>
        <Stat title="Across Locations" value={totalLocations.toLocaleString('en-IN')} icon={<PlaceOutlinedIcon/>} color="#e76d32" tint="#fff4ee"/>
      </Box>
    </Box>
    <Box sx={{ p: 1.2, border: '1px solid #e1e9e5', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(12,66,48,.045)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, flexWrap: 'wrap', mb: 1.15 }}>
        <TextField size="small" placeholder="Search by category name..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}  sx={{ flex: '1 1 220px', '& .MuiInputBase-input': { py: 1.1, fontSize: 11 } }}/>
        <Select size="small" value={status} onChange={resetPage(setStatus)} sx={{ minWidth: 120, fontSize: 11 }}><MenuItem value="All Status">All Status</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></Select>
        <Select size="small" value={storeFilter} onChange={resetPage(setStoreFilter)} sx={{ minWidth: 120, fontSize: 11 }}><MenuItem value="All Stores">All Stores</MenuItem>{stores.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</Select>
        <Select size="small" value={location} onChange={resetPage(setLocation)} sx={{ minWidth: 130, fontSize: 11 }}>{locations.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
        <Select size="small" value={sort} onChange={resetPage(setSort)} sx={{ minWidth: 120, fontSize: 11 }}><MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="name">Name</MenuItem></Select>
        {onCreate&&<Button variant="contained" onClick={onCreate} sx={{ml:'auto',whiteSpace:'nowrap'}} startIcon={<CategoryOutlinedIcon/>}>Add Category</Button>}
        <Tooltip title={grid ? 'Show list' : 'Show grid'}><IconButton onClick={() => setGrid((value) => !value)} sx={{ color: '#075f43', bgcolor: grid ? '#087451' : '#edf7f2', '&:hover': { bgcolor: '#087451', color: '#fff' } }}>{grid ? <FormatListBulletedOutlinedIcon fontSize="small"/> : <GridViewOutlinedIcon fontSize="small"/>}</IconButton></Tooltip>
      </Box>
      {grid ? <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 1 }}>{visible.map((record) => <Box key={record.id} sx={{ p: 1.2, border: '1px solid #e5ece8', borderRadius: 1.5 }}><SafeProductImage src={record.image || record.thumbnailUrl || categoryImageFor(record)} alt="" style={{ width: '100%', height: 100, objectFit: 'contain', background: '#f6f8f7', borderRadius: 7 }}/><Typography fontWeight={800} mt={.8}>{record.name}</Typography><Typography variant="caption">{categoryProducts(record).length} products</Typography><Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><IconButton size="small" onClick={() => onView(record)}><VisibilityOutlinedIcon fontSize="small"/></IconButton><IconButton size="small" onClick={() => onEdit(record)}><EditOutlinedIcon fontSize="small"/></IconButton></Box></Box>)}</Box> : <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" className="admin-categories-table" sx={{ width: '100%', minWidth: 0, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '0 3px', '& th': { p: .9, color: '#fff', textAlign: 'left', fontSize: 10, whiteSpace: 'nowrap', bgcolor: '#075b40' }, '& th:first-of-type': { borderRadius: '8px 0 0 8px' }, '& th:last-of-type': { borderRadius: '0 8px 8px 0' }, '& td': { px: .8, py: .55, borderBottom: '1px solid #edf1ef', fontSize: 10, verticalAlign: 'middle' } }}>
          <Box component="thead"><Box component="tr"><Box component="th" sx={{ width: 38 }}><Checkbox size="small" checked={allVisibleSelected} onChange={toggleAll} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}/></Box>{['Category', 'Description', 'Actions'].map((heading) => <Box component="th" key={heading}>{heading}</Box>)}</Box></Box>
          <Box component="tbody">{visible.map((record) => {
            const active = normalize(record.status || 'Active') === 'active';
            return <Box component="tr" key={record.id} sx={{ '&:hover': { bgcolor: '#f7fbf9' } }}>
              <Box component="td"><Checkbox size="small" checked={selected.includes(String(record.id))} onChange={() => setSelected((current) => current.includes(String(record.id)) ? current.filter((id) => id !== String(record.id)) : [...current, String(record.id)])}/></Box>
              <Box component="td" sx={{ minWidth: 0, overflow: 'hidden' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: .9, minWidth: 0, overflow: 'hidden' }}><SafeProductImage src={record.image || record.thumbnailUrl || categoryImageFor(record)} alt="" style={{ width: 36, height: 32, objectFit: 'contain', borderRadius: 6, background: '#f5f7f6', flexShrink: 0 }}/><Tooltip title={record.name || 'Unnamed category'}><Typography fontSize={10} fontWeight={850} noWrap sx={{minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}}>{record.name || 'Unnamed category'}</Typography></Tooltip></Box></Box>
              <Box component="td" sx={{ minWidth: 0, overflow: 'hidden' }}><Tooltip title={record.description || '—'}><Typography fontSize={10} noWrap sx={{overflow:'hidden',textOverflow:'ellipsis'}}>{record.description || '—'}</Typography></Tooltip></Box>
              <Box component="td" sx={{ whiteSpace: 'nowrap' }}><Tooltip title="View category"><IconButton size="small" onClick={() => onView(record)}><VisibilityOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip>{onEdit&&<Tooltip title="Edit category"><IconButton size="small" onClick={() => onEdit(record)}><EditOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip>}{onToggle&&<Tooltip title={active ? 'Deactivate' : 'Activate'}><IconButton size="small" onClick={() => onToggle(record)} sx={{ color: '#087451' }}><PowerSettingsNewOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip>}{onDelete&&<Tooltip title="Delete category"><IconButton size="small" onClick={() => onDelete(record)} sx={{ color: '#bd3438', bgcolor: '#fff0f0' }}><DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip>}</Box>
            </Box>;
          })}{!visible.length&&<Box component="tr"><Box component="td" colSpan={4} sx={{ py: 5, textAlign: 'center', color: '#68776f' }}>No categories match these filters.</Box></Box>}</Box>
        </Box>
      </Box>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: .3 }}><Typography variant="caption" color="text.secondary">Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} categories{selected.length ? ` · ${selected.length} selected` : ''}</Typography><Box sx={{ display: 'flex', alignItems: 'center' }}><IconButton size="small" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><KeyboardArrowLeftOutlinedIcon/></IconButton><Button size="small" sx={{ minWidth: 28, bgcolor: '#087451', color: '#fff' }}>{safePage}</Button><IconButton size="small" disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: .7, mt: .4 }}>{onExport&&<Button onClick={onExport}>Export</Button>}</Box>
    </Box>
  </Box>;
}
