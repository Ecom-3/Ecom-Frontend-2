import { useCallback, useMemo, useState } from 'react';
import { Box, Button, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage.jsx';
import { productImageFor } from '../../services/categoryImages.js';

const normalize = (value) => String(value || '').trim().toLowerCase();
const Stat = ({ title, value, icon, color, tint }) => <Box sx={{ minWidth: 0, minHeight: 58, p: 1, display: 'flex', alignItems: 'center', gap: 1, border: `1px solid ${color}22`, borderRadius: 2, background: `linear-gradient(115deg,${tint},#fff)` }}><Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: 1.5, display: 'grid', placeItems: 'center', color, bgcolor: `${color}20`, '& svg': { fontSize: 19 } }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography fontSize={16} fontWeight={850} sx={{ lineHeight: 1.15 }}>{value}</Typography><Typography variant="caption" fontSize={10} color="text.secondary">{title}</Typography></Box></Box>;

export default function AdminProductsPage({ records = [], categories = [], stores = [], inventory = [], mappings = [], locations = [], locationScoped = false, onView, onEdit, onDuplicate, onToggle, onDelete, onCreate, onExport, onImport, onManageStores }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [store, setStore] = useState('All Stores');
  const [location, setLocation] = useState('All Locations');
  const [stock, setStock] = useState('Stock Status');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [grid, setGrid] = useState(false);
  const pageSize = 6;
  const categoryOptions = useMemo(() => ['All Categories', ...new Set((locationScoped ? categories : [...categories, ...records.map((item) => typeof item.category === 'object' ? item.category?.name : item.category)]).map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean))], [categories, records, locationScoped]);
  const locationOptions = useMemo(() => ['All Locations', ...new Set([...stores.map((item) => item.location), ...inventory.map((item) => item.location)].filter(Boolean))], [stores, inventory]);
  const stockCount = useCallback((product) => inventory.filter((item) => String(item.productId || item.product?.id) === String(product.id || product.productId)).reduce((sum, item) => sum + Number(item.availableQuantity ?? item.stock ?? 0), 0), [inventory]);
  const storeCount = (product) => new Set(mappings.filter((mapping) => String(mapping.productId || mapping.product?.id) === String(product.id || product.productId) && mapping.available !== false).map((mapping) => String(mapping.storeId || mapping.store?.id)).filter(Boolean)).size;
  const filtered = useMemo(() => records.filter((product) => {
    const search = normalize(query);
    const productCategory = typeof product.category === 'object' ? product.category?.name : product.category;
    const matchesSearch = !search || [product.name, product.sku, product.masterSku, product.barcode, product.description, productCategory].some((value) => normalize(value).includes(search));
    const matchesCategory = category === 'All Categories' || normalize(productCategory) === normalize(category);
    const productMappings = mappings.filter((mapping) => String(mapping.productId || mapping.product?.id) === String(product.id || product.productId) && mapping.available !== false);
    const matchesStore = store === 'All Stores' || productMappings.some((mapping) => String(mapping.storeId || mapping.store?.id) === store);
    const matchesLocation = location === 'All Locations' || productMappings.some((mapping) => { const matchedStore = stores.find((item) => String(item.id) === String(mapping.storeId || mapping.store?.id)); return normalize(matchedStore?.location) === normalize(location); });
    const quantity = stockCount(product);
    const matchesStock = stock === 'Stock Status' || (stock === 'In Stock' ? quantity > 0 : stock === 'Low Stock' ? quantity > 0 && quantity <= Number(product.reorderLevel || 10) : quantity <= 0);
    return matchesSearch && matchesCategory && matchesStore && matchesLocation && matchesStock;
  }).sort((a, b) => sort === 'name' ? String(a.name || '').localeCompare(String(b.name || '')) : sort === 'oldest' ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [records, query, category, store, location, stock, sort, mappings, stores, stockCount]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeCount = records.filter((product) => normalize(product.status || 'Active') === 'active').length;
  const resetPage = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const categoryTone = (value) => {
    const colors = [['#0d8751','#e5f7ec'], ['#b56a11','#fff2df'], ['#6851c8','#f0ebff'], ['#126ab4','#e7f2ff'], ['#d04470','#ffedf3']];
    const index = Math.abs(String(value || '').split('').reduce((total, char) => total + char.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  };

  return <Box sx={{ display: 'grid', gap: 1.2 }}>
    <Box className="admin-products-hero" sx={{ display: 'grid', gridTemplateColumns: 'minmax(240px,1.3fr) repeat(3,minmax(130px,1fr))', alignItems: 'center', gap: 1.1, p: 1.2, border: '1px solid #d9eee5', borderRadius: 2, bgcolor: '#fff', background: 'linear-gradient(110deg,#eaf8f2 0%,#fff 42%)', '@media(max-width:760px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, gridColumn: { xs: '1 / -1', md: 'auto' } }}><Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: 1.5, bgcolor: '#087451', color: '#fff', display: 'grid', placeItems: 'center' }}><Inventory2OutlinedIcon/></Box><Box sx={{ minWidth: 0 }}><Typography fontSize={21} fontWeight={850} lineHeight={1.2}>Products</Typography><Typography variant="caption" color="text.secondary">Manage your products, inventory and stock across all locations.</Typography></Box></Box>
      <Stat title="Total Products" value={records.length.toLocaleString('en-IN')} icon={<Inventory2OutlinedIcon/>} color="#07845b" tint="#e9f8f1"/>
      <Stat title="Total Stores" value={stores.length.toLocaleString('en-IN')} icon={<StorefrontOutlinedIcon/>} color="#1477c9" tint="#eef7ff"/>
      <Stat title="Locations" value={locations.length.toLocaleString('en-IN')} icon={<PlaceOutlinedIcon/>} color="#7250d6" tint="#f4f0ff"/>
    </Box>
    <Box sx={{ p: 1.2, border: '1px solid #e1e9e5', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(12,66,48,.045)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, flexWrap: 'wrap', mb: 1.15 }}>
        <TextField size="small" placeholder="Search by product name, SKU or barcode..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}  sx={{ flex: '1 1 230px', '& .MuiInputBase-input': { py: 1.1, fontSize: 11 } }}/>
        <Select size="small" value={category} onChange={resetPage(setCategory)} sx={{ minWidth: 125, fontSize: 11 }}>{categoryOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
        <Select size="small" value={store} onChange={resetPage(setStore)} sx={{ minWidth: 120, fontSize: 11 }}><MenuItem value="All Stores">All Stores</MenuItem>{stores.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}</Select>
        <Select size="small" value={location} onChange={resetPage(setLocation)} sx={{ minWidth: 130, fontSize: 11 }}>{locationOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
        <Select size="small" value={stock} onChange={resetPage(setStock)} sx={{ minWidth: 120, fontSize: 11 }}><MenuItem value="Stock Status">Stock Status</MenuItem><MenuItem value="In Stock">In Stock</MenuItem><MenuItem value="Low Stock">Low Stock</MenuItem><MenuItem value="Out of Stock">Out of Stock</MenuItem></Select>
        <Select size="small" value={sort} onChange={resetPage(setSort)} sx={{ minWidth: 100, fontSize: 11 }}><MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="name">Name</MenuItem></Select>
        <Tooltip title={grid ? 'Show list' : 'Show grid'}><IconButton onClick={() => setGrid((value) => !value)} sx={{ color: '#075f43', bgcolor: grid ? '#087451' : '#edf7f2', '&:hover': { bgcolor: '#087451', color: '#fff' } }}>{grid ? <FormatListBulletedOutlinedIcon fontSize="small"/> : <GridViewOutlinedIcon fontSize="small"/>}</IconButton></Tooltip>
      </Box>
      {grid ? <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 1 }}>{visible.map((product) => <Box key={product.id} sx={{ p: 1.2, border: '1px solid #e5ece8', borderRadius: 1.5 }}><SafeProductImage src={product.image || productImageFor(product)} alt="" style={{ width: '100%', height: 105, objectFit: 'contain', background: '#f6f8f7', borderRadius: 7 }}/><Typography fontWeight={800} fontSize={12} mt={.8}>{product.name}</Typography><Typography variant="caption">{product.sku || product.masterSku || 'No SKU'}</Typography><Box sx={{ display: 'flex', gap: .5, mt: .8 }}><Chip size="small" label={`₹${Number(product.price || product.defaultPrice || 0).toLocaleString('en-IN')}`}/><Chip size="small" label={`Stock: ${stockCount(product)}`}/></Box><Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: .5 }}><IconButton size="small" onClick={() => onView(product)}><VisibilityOutlinedIcon fontSize="small"/></IconButton><IconButton size="small" onClick={() => onEdit(product)}><EditOutlinedIcon fontSize="small"/></IconButton></Box></Box>)}</Box> : <Box sx={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>
        <Box component="table" className="admin-products-table" sx={{ width: '100%', minWidth: 0, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '0 3px', '& th': { p: .9, color: '#fff', textAlign: 'left', fontSize: 10, whiteSpace: 'nowrap', bgcolor: '#075b40' }, '& th:first-of-type': { borderRadius: '8px 0 0 8px' }, '& th:last-of-type': { borderRadius: '0 8px 8px 0' }, '& td': { px: .8, py: .55, borderBottom: '1px solid #edf1ef', fontSize: 10, verticalAlign: 'middle' } }}>
          <Box component="thead"><Box component="tr">{['Product', 'SKU', 'Category', 'Price', 'Stock (Total)', 'Stores', 'Status', 'Actions'].map((heading) => <Box component="th" key={heading}>{heading}</Box>)}</Box></Box>
          <Box component="tbody">{visible.map((product) => {
            const quantity = stockCount(product);
            const categoryName = typeof product.category === 'object' ? product.category?.name : product.category;
            const [tone, tint] = categoryTone(categoryName);
            const statusActive = normalize(product.status || 'Active') === 'active';
            return <Box component="tr" key={product.id} sx={{ '&:hover': { bgcolor: '#f7fbf9' } }}>
              <Box component="td" sx={{ minWidth: 0, maxWidth: 0, overflow: 'hidden' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: .85, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}><SafeProductImage src={product.image || productImageFor(product)} alt="" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 6, background: '#f1f5f3', flexShrink: 0 }}/><Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}><Typography title={product.name || 'Unnamed product'} fontSize={10} fontWeight={850} sx={{ display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name || 'Unnamed product'}</Typography><Typography title={product.description || product.subtitle || 'Catalog product'} variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.description || product.subtitle || 'Catalog product'}</Typography></Box></Box></Box>
              <Box component="td" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={product.sku || product.masterSku || '—'} sx={{ height: 22, fontSize: 9, fontWeight: 700, bgcolor: '#f0f4f8' }}/></Box>
              <Box component="td"><Chip title={categoryName || 'Uncategorized'} size="small" label={categoryName || 'Uncategorized'} sx={{ maxWidth: '100%', height: 22, fontSize: 9, fontWeight: 800, color: tone, bgcolor: tint, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}/></Box>
              <Box component="td" sx={{ whiteSpace: 'nowrap', fontWeight: 850 }}>₹{Number(product.price || product.defaultPrice || product.defaultPriceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Box>
              <Box component="td"><Chip size="small" label={`Stock: ${quantity}`} sx={{ height: 22, fontSize: 9, fontWeight: 800, color: quantity > 10 ? '#087443' : quantity > 0 ? '#ae5c00' : '#b4232e', bgcolor: quantity > 10 ? '#e3f6e8' : quantity > 0 ? '#fff2df' : '#ffeaec' }}/></Box>
              <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .4 }}><StorefrontOutlinedIcon sx={{ color: '#087451', fontSize: 15 }}/><Typography fontSize={10} fontWeight={750}>{storeCount(product)}</Typography></Box></Box>
              <Box component="td"><Chip size="small" label={product.status || 'Active'} sx={{ height: 20, fontSize: 9, fontWeight: 800, color: statusActive ? '#087443' : '#a45b00', bgcolor: statusActive ? '#e3f6e8' : '#fff0dc' }}/></Box>
              <Box component="td" sx={{ whiteSpace: 'nowrap' }}><Tooltip title="View product"><IconButton size="small" onClick={() => onView(product)}><VisibilityOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip><Tooltip title="Edit product"><IconButton size="small" onClick={() => onEdit(product)}><EditOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip><Tooltip title="Duplicate"><IconButton size="small" onClick={() => onDuplicate(product)}><ContentCopyOutlinedIcon sx={{ fontSize: 15 }}/></IconButton></Tooltip>{onManageStores&&<Tooltip title="Manage stores"><IconButton size="small" onClick={() => onManageStores(product)}><StorefrontOutlinedIcon sx={{ fontSize: 15 }}/></IconButton></Tooltip>}<Tooltip title={statusActive ? 'Deactivate' : 'Activate'}><IconButton size="small" onClick={() => onToggle(product)} sx={{ color: '#087451' }}><PowerSettingsNewOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip><Tooltip title="Delete product"><IconButton size="small" onClick={() => onDelete(product)} sx={{ color: '#bd3438', bgcolor: '#fff0f0' }}><DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip></Box>
            </Box>;
          })}{!visible.length&&<Box component="tr"><Box component="td" colSpan={9} sx={{ py: 5, textAlign: 'center', color: '#68776f' }}>No products match these filters.</Box></Box>}</Box>
        </Box>
      </Box>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: .3 }}><Typography variant="caption" color="text.secondary">Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length.toLocaleString('en-IN')} products · {activeCount} active</Typography><Box sx={{ display: 'flex', alignItems: 'center' }}><IconButton size="small" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><KeyboardArrowLeftOutlinedIcon/></IconButton><Button size="small" sx={{ minWidth: 28, bgcolor: '#087451', color: '#fff' }}>{safePage}</Button><IconButton size="small" disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: .7, mt: .4 }}>{onImport&&<Button onClick={onImport}>Import</Button>}{onExport&&<Button onClick={onExport}>Export</Button>}{onCreate&&<Button variant="contained" onClick={onCreate}>Create Product</Button>}</Box>
    </Box>
  </Box>;
}
