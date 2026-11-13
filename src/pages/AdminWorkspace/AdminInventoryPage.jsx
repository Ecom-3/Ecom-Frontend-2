import { useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControl, IconButton, InputAdornment, Menu, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage';

const stockStatus = (record) => {
  const quantity = Number(record.availableQuantity ?? record.stock ?? 0);
  if (quantity <= 0) return 'Out of stock';
  if (Number(record.reorderLevel ?? record.lowStockAt ?? 0) > 0 && quantity <= Number(record.reorderLevel ?? record.lowStockAt)) return 'Low stock';
  return 'In stock';
};

const InventoryStat = ({ title, value, icon, tone, tint }) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, p: 1.6, minWidth: 0, border: `1px solid ${tone}25`, borderRadius: 2, background: `linear-gradient(120deg,${tint},#fff)` }}><Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1.5, color: tone, bgcolor: `${tone}20` }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography variant="caption" color="#33443b" fontWeight={650}>{title}</Typography><Typography variant="h6" fontWeight={850} sx={{ lineHeight: 1.2 }} color="#142c22">{value}</Typography></Box></Box>;

export default function AdminInventoryPage({ records = [], stores = [], locations = [], categories = [], onView, onAdjust, onStock, onCreate, onExport, onImportData, stockBusy = '' }) {
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [storeFilter, setStoreFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [moreRecord, setMoreRecord] = useState(null);
  const [importError, setImportError] = useState('');
  const importInputRef = useRef(null);
  const pageSize = 10;
  const rowKey = (record) => String(record.id || `${record.productId}:${record.variantId || "product"}:${record.storeId}`);
  const locationOptions = useMemo(() => [...new Set([...locations, ...records.map((record) => record.location)].map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [locations, records]);
  const categoryOptions = useMemo(() => [...new Set(categories.map((value) => typeof value === 'string' ? value.trim() : value?.name?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [categories]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery = !normalizedQuery || [record.name, record.sku, record.store, record.location, record.category, record.productId, record.variantId].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
      const matchesLocation = locationFilter === 'All' || String(record.location || '') === locationFilter;
      const matchesStore = storeFilter === 'All' || String(record.storeId || '') === storeFilter;
      const matchesCategory = categoryFilter === 'All' || String(typeof record.category === 'object' ? record.category?.name : record.category || '') === categoryFilter;
      const matchesStock = stockFilter === 'All' || stockStatus(record) === stockFilter;
      return matchesQuery && matchesLocation && matchesStore && matchesCategory && matchesStock;
    }).sort((a, b) => sort === 'name'
      ? String(a.name || '').localeCompare(String(b.name || ''))
      : sort === 'stock'
        ? Number(a.availableQuantity ?? a.stock ?? 0) - Number(b.availableQuantity ?? b.stock ?? 0)
        : String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  }, [records, query, locationFilter, storeFilter, categoryFilter, stockFilter, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const shown = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const lowStockCount = records.filter((record) => stockStatus(record) === 'Low stock' || stockStatus(record) === 'Out of stock').length;
  const resetPage = (setter) => (value) => { setter(value); setPage(1); };
  const selectSx = { minWidth: 138, '& .MuiSelect-select': { py: 1.15, pl: 1.2, fontSize: 12 } };
  const allShownSelected = shown.length > 0 && shown.every((record) => selectedIds.includes(rowKey(record)));
  const toggleShownSelection = () => setSelectedIds((current) => allShownSelected
    ? current.filter((id) => !shown.some((record) => rowKey(record) === id))
    : [...new Set([...current, ...shown.map((record) => rowKey(record))])]);
  const importInventoryFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('Choose a non-empty JSON array exported from Inventory.');
      await onImportData(parsed);
      setImportError('');
    } catch (error) { setImportError(error.message || 'Could not import this inventory file.'); }
  };
  const pageNumbers = pageCount <= 6 ? Array.from({ length: pageCount }, (_, index) => index + 1) : safePage <= 3 ? [1, 2, 3, 4, 5, '…', pageCount] : safePage >= pageCount - 2 ? [1, '…', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount] : [1, '…', safePage - 1, safePage, safePage + 1, '…', pageCount];

  return <Box sx={{ display: 'grid', gap: 1.2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: .8, flexWrap: 'wrap' }}><input ref={importInputRef} hidden type="file" accept=".json,application/json" onChange={importInventoryFile}/><Button size="small" variant="outlined" startIcon={<FileUploadOutlinedIcon/>} onClick={()=>importInputRef.current?.click()}>Import</Button><Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon/>} onClick={onExport}>Export</Button><Button size="small" variant="contained" startIcon={<AddOutlinedIcon/>} onClick={onCreate}>Add Product</Button></Box>
    {importError&&<Alert severity="error" onClose={()=>setImportError('')}>{importError}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 1.5, '@media(max-width:900px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }, '@media(max-width:480px)': { gridTemplateColumns: '1fr 1fr', gap: 1 } }}>
      <InventoryStat title="Inventory Items" value={records.length.toLocaleString()} icon={<Inventory2OutlinedIcon/>} tone="#16815d" tint="#f0fbf5"/>
      <InventoryStat title="Total Stores" value={stores.length.toLocaleString()} icon={<StorefrontOutlinedIcon/>} tone="#1684d5" tint="#f1f7ff"/>
      <InventoryStat title="Total Locations" value={locationOptions.length.toLocaleString()} icon={<LocationOnOutlinedIcon/>} tone="#7256dc" tint="#f7f4ff"/>
      <InventoryStat title="Low / Out of Stock Items" value={lowStockCount.toLocaleString()} icon={<WarningAmberOutlinedIcon/>} tone="#ed8b25" tint="#fff8ee"/>
    </Box>
    <Box sx={{ p: 1, border: '1px solid #e4ebe8', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(18,60,45,.045)' }}>
      <Box sx={{ display: 'flex', gap: .8, flexWrap: 'wrap', alignItems: 'center', mb: 1.2 }}>
        <TextField size="small" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search by product name, SKU, store or location..." sx={{ flex: '1 1 265px', '& input': { fontSize: 12 } }} />
        <FormControl size="small"><Select value={locationFilter} onChange={(event) => resetPage(setLocationFilter)(event.target.value)} startAdornment={<InputAdornment position="start"><LocationOnOutlinedIcon sx={{ fontSize: 17 }}/></InputAdornment>} sx={selectSx}><MenuItem value="All">All Locations</MenuItem>{locationOptions.map((location) => <MenuItem key={location} value={location}>{location}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><Select value={storeFilter} onChange={(event) => resetPage(setStoreFilter)(event.target.value)} startAdornment={<InputAdornment position="start"><StorefrontOutlinedIcon sx={{ fontSize: 17 }}/></InputAdornment>} sx={selectSx}><MenuItem value="All">All Stores</MenuItem>{stores.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><Select value={categoryFilter} onChange={(event) => resetPage(setCategoryFilter)(event.target.value)} startAdornment={<InputAdornment position="start"><CategoryOutlinedIcon sx={{ fontSize: 17 }}/></InputAdornment>} sx={selectSx}><MenuItem value="All">All Categories</MenuItem>{categoryOptions.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><Select value={stockFilter} onChange={(event) => resetPage(setStockFilter)(event.target.value)} startAdornment={<InputAdornment position="start"><LayersOutlinedIcon sx={{ fontSize: 17 }}/></InputAdornment>} sx={selectSx}><MenuItem value="All">Stock Status</MenuItem>{['In stock', 'Low stock', 'Out of stock'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><Select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} startAdornment={<InputAdornment position="start"><SwapVertOutlinedIcon sx={{ fontSize: 17 }}/></InputAdornment>} sx={{ ...selectSx, minWidth: 112 }}><MenuItem value="name">Name</MenuItem><MenuItem value="newest">Newest</MenuItem><MenuItem value="stock">Lowest stock</MenuItem></Select></FormControl>
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', minWidth: 850, borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: 13 }}>
          <Box component="thead"><Box component="tr" sx={{ bgcolor: '#075f43', color: '#fff', '& th:first-of-type': { borderRadius: '8px 0 0 8px' }, '& th:last-of-type': { borderRadius: '0 8px 8px 0' } }}>
            <Box component="th" sx={{ width: 42, px: .7 }}><Checkbox size="small" checked={allShownSelected} indeterminate={selectedIds.length > 0 && !allShownSelected} onChange={toggleShownSelection} sx={{ color: '#fff', '&.Mui-checked,&.MuiCheckbox-indeterminate': { color: '#fff' } }}/></Box>
            {[[<Inventory2OutlinedIcon/>, 'Product'], [<StorefrontOutlinedIcon/>, 'Store Name'], [<LocationOnOutlinedIcon/>, 'Location'], [<LayersOutlinedIcon/>, 'Stock'], [null, 'Actions']].map(([icon, heading]) => <Box component="th" key={heading} sx={{ textAlign: heading === 'Actions' ? 'right' : 'left', px: 1.2, py: 1.05, fontSize: 12, fontWeight: 750, whiteSpace: 'nowrap' }}><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: heading === 'Actions' ? 'flex-end' : 'flex-start', gap: .65 }}>{icon&&<Box sx={{ display: 'inline-flex', '& svg': { fontSize: 16 } }}>{icon}</Box>}{heading}{heading==='Product'&&<SwapVertOutlinedIcon sx={{fontSize:15,opacity:.85}}/>}</Box></Box>)}
          </Box></Box>
          <Box component="tbody">{shown.map((record) => {
            const quantity = Number(record.availableQuantity ?? record.stock ?? 0);
            const state = stockStatus(record);
            const color = state === 'In stock' ? '#dff5e7' : state === 'Low stock' ? '#fff0d8' : '#fee2e2';
            const ink = state === 'In stock' ? '#087443' : state === 'Low stock' ? '#a45b00' : '#a32626';
            return <Box component="tr" key={rowKey(record)} sx={{ bgcolor: '#fff', '&:hover': { bgcolor: '#f7fbf9' }, '& td': { borderBottom: '1px solid #e8eeeb' } }}>
              <Box component="td" sx={{ width: 42, px: .7, borderBottom: '1px solid #e8eeeb' }}><Checkbox size="small" checked={selectedIds.includes(rowKey(record))} onChange={() => setSelectedIds((current) => current.includes(rowKey(record)) ? current.filter((id) => id !== rowKey(record)) : [...current, rowKey(record)])}/></Box>
              <Box component="td" sx={{ p: 1, minWidth: 260 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}><SafeProductImage src={record.productImage} alt="" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#f1f5f3' }}/><Box sx={{ minWidth: 0 }}><Typography fontWeight={750} noWrap>{record.name || 'Catalog product'}</Typography><Typography variant="caption" color="text.secondary" noWrap>SKU: {record.sku || '—'}</Typography></Box></Box></Box>
              <Box component="td" sx={{ p: 1.1, minWidth: 155 }}><Typography fontWeight={650}>{record.store || 'Unassigned'}</Typography></Box>
              <Box component="td" sx={{ p: 1.1, minWidth: 145 }}><Typography fontWeight={650}>{record.location || '—'}</Typography></Box>
              <Box component="td" sx={{ p: 1.1, whiteSpace: 'nowrap' }}><Chip size="small" label={`Stock: ${quantity}`} sx={{ bgcolor: color, color: ink, fontWeight: 750 }}/>{state !== 'In stock' && <Typography display="block" variant="caption" sx={{ color: ink, mt: .3 }}>{state}</Typography>}</Box>
              <Box component="td" sx={{ p: .7, textAlign: 'right', whiteSpace: 'nowrap' }}><Tooltip title="View inventory details"><IconButton size="small" disabled={!record.id} onClick={() => onView(record)} sx={{color:'#075f43',bgcolor:'#f2f8f5',mr:.4}}><VisibilityOutlinedIcon fontSize="small"/></IconButton></Tooltip><Tooltip title="Stock +10"><IconButton size="small" onClick={() => onStock(record, 'increase', 10, 'Manual stock in')} disabled={!record.id || stockBusy === `${record.id}:increase:10`} sx={{color:'#075f43',bgcolor:'#f2f8f5',mr:.4}}><AddBoxOutlinedIcon fontSize="small"/></IconButton></Tooltip><Tooltip title={record.id ? "Adjust inventory" : "Set initial stock"}><IconButton size="small" onClick={() => onAdjust(record)} sx={{color:'#075f43',bgcolor:'#f2f8f5',mr:.4}}><TuneOutlinedIcon fontSize="small"/></IconButton></Tooltip><Tooltip title="More actions"><IconButton size="small" disabled={!record.id} onClick={(event)=>{setMoreAnchor(event.currentTarget);setMoreRecord(record);}} sx={{color:'#52645b'}}><MoreVertOutlinedIcon fontSize="small"/></IconButton></Tooltip></Box>
            </Box>;
          })}{!shown.length && <Box component="tr"><Box component="td" colSpan={6} sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No inventory records match these filters.</Box></Box>}</Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1, px: .5, flexWrap: 'wrap' }}><Typography variant="caption" color="text.secondary">Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} inventory items</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: .45 }}>{selectedIds.length>0&&<Typography variant="caption" color="text.secondary" sx={{mr:.5}}>{selectedIds.length} selected</Typography>}<IconButton size="small" disabled={safePage<=1} onClick={()=>setPage((value)=>Math.max(1,value-1))}><KeyboardArrowLeftOutlinedIcon/></IconButton>{pageNumbers.map((number,index)=>number==='…'?<Typography key={`dots-${index}`} variant="caption" sx={{px:.35}}>…</Typography>:<Button key={number} size="small" onClick={()=>setPage(number)} sx={{minWidth:27,width:27,height:27,p:0,bgcolor:number===safePage?'#087451':'transparent',color:number===safePage?'#fff':'#26382f',borderRadius:1,fontWeight:number===safePage?800:500,'&:hover':{bgcolor:number===safePage?'#075f43':'#edf5f1'}}}>{number}</Button>)}<IconButton size="small" disabled={safePage>=pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
    </Box>
    <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={()=>{setMoreAnchor(null);setMoreRecord(null);}}><MenuItem onClick={()=>{onStock(moreRecord,'decrease',1,'Manual stock out');setMoreAnchor(null);setMoreRecord(null);}}>Stock −1</MenuItem><MenuItem onClick={()=>{onAdjust(moreRecord);setMoreAnchor(null);setMoreRecord(null);}}>Adjust inventory</MenuItem><MenuItem onClick={()=>{onView(moreRecord);setMoreAnchor(null);setMoreRecord(null);}}>View details</MenuItem></Menu>
  </Box>;
}
