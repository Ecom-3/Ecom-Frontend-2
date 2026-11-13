import DeliveryPartners from './DeliveryPartners';
import { useManagerOrders } from '../../hooks/useManagerOrders';
import { storeManagerNavItems as navItems } from '../../config/storeManagerNavigation';
import { useContext, useEffect, useState } from 'react';
import { Alert, Autocomplete, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { clearDeliveryQuoteCache, createImage, createStoreDeliveryZone, createStoreManagerProduct, createVariant, deleteImage, deleteStoreDeliveryZone, deleteStoreManagerProduct, deleteVariant, getCategories, getProduct, getStore, getStoreDeliveryZones, getStoreManagerProducts, getStoreProducts, getStores, setStoreManagerProductAvailability, updateStoreProduct, updateImage, updateStore, updateStoreDeliveryZone, updateStoreManagerProduct, updateVariant } from '../../services/catalogApi';
import { adaptProduct, adaptStoreProduct } from '../../services/catalogAdapter.js';
import { collectionStore, staffProfileStore } from '../../services/localDataService';
import { validateStaffPasswordChange } from '../../utils/staffPasswordValidation.js';
import { profileModeRequiresAssignedStore, profileModeWaitsForAssignedStore } from '../../utils/storeManagerProfileMode.js';
import { summarizeOrders } from '../AdminWorkspace/adminReportData.js';
import { DELIVERY_MODE_OPTIONS } from '../../utils/storeDelivery.js';
import { toStoreManagerImagePayload, toStoreManagerProductPayload, toStoreManagerVariantPayload, validateStoreManagerProductForm } from './storeManagerProductForm.js';
import logo from '../../assets/images/logo.png';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage';
import PasswordField from '../../components/PasswordField.jsx';
import './StoreManagerPortal.css';
import './DeliveryRadius.css';



const money = (value) => Number(value || 0).toLocaleString('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 });
const numberOrNull = (value) => value === '' || value === null || value === undefined ? null : Number(value);
const zoneLabel = (zone) => `${Number(zone.minRadiusKm || 0).toFixed(Number(zone.minRadiusKm || 0) % 1 ? 1 : 0)}-${Number(zone.maxRadiusKm || zone.radiusKm || 0).toFixed(Number(zone.maxRadiusKm || zone.radiusKm || 0) % 1 ? 1 : 0)} KM`;
const etaLabel = (zone, method) => method?.estimatedTime || [zone.estimatedDeliveryMin, zone.estimatedDeliveryMax].filter(Boolean).join('-') + (zone.estimatedDeliveryMin || zone.estimatedDeliveryMax ? ' min' : '');
const TILE_SIZE = 256;
const EARTH_CIRCUMFERENCE_METERS = 40075016.686;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lonToTileX = (lon, zoom) => ((lon + 180) / 360) * 2 ** zoom;
const latToTileY = (lat, zoom) => {
  const rad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** zoom;
};
const metersPerPixel = (lat, zoom) => Math.cos(lat * Math.PI / 180) * EARTH_CIRCUMFERENCE_METERS / (TILE_SIZE * 2 ** zoom);
const isNotFound = (reason) => String(reason?.message || reason || '').toLowerCase().includes('not found');
const cleanApiMessage = (reason, fallback) => isNotFound(reason) ? fallback : reason?.message || fallback;
const normalizeStore = (store = {}) => ({
  ...store,
  isNew: store.isNew === true,
  storeType: store.isNew === true ? 'New' : 'Old',
  delivery: store.delivery ?? (store.deliveryEnabled === false ? 'No' : 'Yes'),
  pickup: store.pickup ?? (store.pickupEnabled === false ? 'No' : 'Yes'),
  status: store.status || (store.active === false ? 'Inactive' : 'Active'),
});

const emptyRule = (radiusKm = '') => ({
  radiusKm,
  minRadiusKm: 0,
  maxRadiusKm: radiusKm,
  deliveryCharge: 20,
  freeDeliveryAbove: 499,
  minimumOrder: 100,
  estimatedDeliveryMin: 15,
  estimatedDeliveryMax: 20,
  status: 'Active',
  methods: DELIVERY_MODE_OPTIONS.map((deliveryType, index) => ({
    deliveryType,
    enabled: index < 3 || deliveryType === 'Store Pickup',
    deliveryCharge: deliveryType === 'Store Pickup' ? 0 : index === 1 ? 50 : index === 2 ? 40 : 20,
    estimatedTime: deliveryType === 'Store Pickup' ? 'Ready as scheduled' : '15-20 min',
    cutoffTime: '',
    settingsConfiguration: '{}',
  })),
});

const StoreMap = ({ store, rules, editingRule }) => {
  const [zoom, setZoom] = useState(12);
  const lat = Number(store?.latitude);
  const lng = Number(store?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return <Box className="sm-map-empty">Store latitude and longitude are required to show the map.</Box>;
  const circles = [...rules, editingRule].filter(Boolean)
    .map((rule) => Number(rule.radiusKm || rule.maxRadiusKm))
    .filter((value, index, values) => value > 0 && values.indexOf(value) === index)
    .sort((a, b) => b - a);
  const centerX = lonToTileX(lng, zoom) * TILE_SIZE;
  const centerY = latToTileY(lat, zoom) * TILE_SIZE;
  const tileRange = 3;
  const centerTileX = Math.floor(centerX / TILE_SIZE);
  const centerTileY = Math.floor(centerY / TILE_SIZE);
  const tileOffsetX = centerX - centerTileX * TILE_SIZE;
  const tileOffsetY = centerY - centerTileY * TILE_SIZE;
  const tileCount = tileRange * 2 + 1;
  const tileBase = `calc(50% - ${tileOffsetX + tileRange * TILE_SIZE}px)`;
  const tileTop = `calc(50% - ${tileOffsetY + tileRange * TILE_SIZE}px)`;
  const maxTile = 2 ** zoom;
  const tileRows = Array.from({ length:tileCount * tileCount }, (_, index) => {
    const dx = index % tileCount - tileRange;
    const dy = Math.floor(index / tileCount) - tileRange;
    const x = ((centerTileX + dx) % maxTile + maxTile) % maxTile;
    const y = centerTileY + dy;
    return y >= 0 && y < maxTile ? { x, y, dx:dx + tileRange, dy:dy + tileRange } : null;
  }).filter(Boolean);
  const scale = metersPerPixel(lat, zoom);
  return <Box className="sm-map">
    <Box className="sm-tile-layer" style={{ left:tileBase, top:tileTop, width:tileCount * TILE_SIZE, height:tileCount * TILE_SIZE }}>
      {tileRows.map((tile) => <img key={`${zoom}-${tile.x}-${tile.y}`} src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} alt="" style={{ left:tile.dx * TILE_SIZE, top:tile.dy * TILE_SIZE }} draggable="false" />)}
    </Box>
    <Box className="sm-map-controls">
      <Button size="small" aria-label="Zoom in" onClick={() => setZoom((value) => clamp(value + 1, 10, 16))}>+</Button>
      <Button size="small" aria-label="Zoom out" onClick={() => setZoom((value) => clamp(value - 1, 10, 16))}>-</Button>
    </Box>
    <span className="sm-store-pin">Store</span>
    {circles.map((radius) => {
      const size = radius * 1000 * 2 / scale;
      return <span key={radius} className="sm-radius-circle" style={{ width:`${size}px`, height:`${size}px` }}><b>{radius} KM</b></span>;
    })}
  </Box>;
};

const useAssignedStore = (user, { enabled = true } = {}) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const storeId = user?.storeId || collectionStore.list('stores').find((item) => item.name === user?.store || item.id === user?.store)?.id || '';
  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      return () => { cancelled = true; };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
     
    setError('');
    const local = collectionStore.list('stores').find((item) => item.id === storeId || item.name === user?.store);
    const request = storeId
      ? getStore(storeId, { auth:true }).catch(() => getStores({}, { auth:true }).then((stores) => stores.find((item) => item.id === storeId || item.name === user?.store)))
      : getStores({}, { auth:true }).then((stores) => stores.find((item) => item.name === user?.store));
    Promise.resolve(request)
      .then((payload) => {
        if (cancelled) return;
        const next = normalizeStore(payload || local || {});
        if (next.id) collectionStore.upsert('stores', next);
        setStore(next.id ? next : null);
        setError(next.id ? '' : 'Assigned store is not configured yet.');
      })
      .catch((reason) => {
        if (!cancelled) {
          setStore(local ? normalizeStore(local) : null);
          setError(local ? '' : reason.message || 'Could not load assigned store.');
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [enabled, storeId, user?.store]);
  return { store, setStore, loading, error };
};

const StoreManagerShell = ({ active, children, store }) => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AppContext);
  const openNav = (path) => {
    if (path === 'logout') {
      logout();
      navigate('/team-login');
      return;
    }
    navigate(path);
  };
  return <Box className="sm-shell">
    <aside className="sm-sidebar">
      <Box className="sm-brand"><img src={logo} alt="Spices and Pickles"/><Box><Typography variant="h6">Store Manager</Typography><Typography>{store?.name || user?.store || 'Assigned store'}</Typography></Box></Box>
      <nav>{navItems.map(([id, label, Icon, path]) => <Button key={id} className={active === id ? 'active' : ''} startIcon={<Icon/>} onClick={() => openNav(path)}><span>{label}</span></Button>)}</nav>
      <Button className="sm-customer-link" onClick={() => navigate('/home')}>View Customer App</Button>
    </aside>
    <main className="sm-main">
      <header className="sm-topbar"><Button startIcon={<MenuIcon/>} onClick={() => navigate('/store-manager/dashboard')}>Store Manager</Button><Button className="sm-user" onClick={() => navigate('/store-manager/profile')}><Avatar>{(user?.name || 'S')[0]}</Avatar><span>{user?.name || 'Manager'}</span></Button><Button color="error" onClick={() => { logout(); navigate('/team-login'); }}>Sign out</Button></header>
      {children}
    </main>
  </Box>;
};

const DeliveryPartnersPage = () => <StoreManagerShell active="delivery-partners"><DeliveryPartners /></StoreManagerShell>;

const blankManagerProduct = (categoryId = '') => ({
  categoryId, name:'', slug:'', sku:'', subcategory:'Other', description:'', brand:'', ingredients:'',
  specifications:'', pack:'', type:'', shelfLife:'', tags:'', highlights:'', aboutSource:'', status:'ACTIVE', available:true,
  variants:[{ sku:'', name:'', attributes:'', price:'', compareAtPrice:'', active:true }], images:[],
});

const fetchStoreProducts = async (storeId) => {
  if (!storeId) return [];
  const [managerResponse, assignedResponse] = await Promise.all([
    getStoreManagerProducts({ size:200, sort:'name,asc' }),
    getStoreProducts(storeId, { size:200, sort:'name,asc' }),
  ]);
  const ownedProducts = Array.isArray(managerResponse) ? managerResponse : managerResponse?.content || managerResponse?.items || [];
  const assignedProducts = (await Promise.all((Array.isArray(assignedResponse) ? assignedResponse : assignedResponse?.content || assignedResponse?.items || [])
    .map(adaptStoreProduct)
    .filter((mapping) => mapping.storeId === storeId && mapping.productId)
    .map(async (mapping) => {
      let product = mapping.product;
      if (!product) {
        try { product = adaptProduct(await getProduct(mapping.productId, { auth:true })); }
        catch { return null; }
      }
      return { ...product, id:mapping.productId || product.id, storeProductId:mapping.id, priceOverride:mapping.priceOverride, locationAvailable:mapping.available, managerOwned:false };
    }))).filter(Boolean);
  const byId = new Map(assignedProducts.map((product) => [String(product.id), product]));
  ownedProducts.forEach((product) => byId.set(String(product.id), { ...product, managerOwned:true }));
  return [...byId.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
};

const StoreManagerProductsPage = () => {
  const { user } = useContext(AppContext);
  const { store, loading:storeLoading, error:storeError } = useAssignedStore(user);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankManagerProduct());
  const [errors, setErrors] = useState({});
  const [deleting, setDeleting] = useState(null);
  const productFieldSuggestions = (key) => {
    const presets = { subcategory:['Pickles','Spices','Dry Fruits','Snacks','Masala','Other'], pack:['100 g','200 g','250 g','500 g','1 kg','Pack of 1','Pack of 2'], type:['Vegetarian','Non-vegetarian','Organic','Regular'], shelfLife:['3 months','6 months','9 months','12 months'] };
    const values = products.flatMap((product) => { const value = product[key]; return key === 'tags' ? (Array.isArray(value) ? value : String(value || '').split(',')) : Array.isArray(value) ? value : [value]; });
    return [...new Set([...(presets[key] || []), ...values].map((value) => String(value || '').trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  };
  const renderProductSuggestion = (key, label) => <Autocomplete freeSolo options={productFieldSuggestions(key)} value={form[key] || ''} onChange={(_, value) => setField(key, value || '')} onInputChange={(_, value, reason) => { if (reason === 'input') setField(key, value); }} renderInput={(params) => <TextField {...params} label={label} placeholder="Choose a suggestion or type a new value"/>}/>;

  const loadStoreProducts = async () => {
    const products = await fetchStoreProducts(store?.id);
    setProducts(products);
    return products;
  };

  const reloadProducts = async () => {
    await loadStoreProducts();
  };

  useEffect(() => {
    let current = true;
    if (!store?.id) return () => { current = false; };
    Promise.all([fetchStoreProducts(store.id), getCategories()])
      .then(([loadedProducts, categoryResponse]) => {
        if (!current) return;
        setProducts(loadedProducts);
        setCategories(Array.isArray(categoryResponse) ? categoryResponse : categoryResponse?.content || []);
        setError('');
      })
      .catch((reason) => current && setError(reason?.message || 'Products could not be loaded for this store.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [store?.id]);

  const openCreate = () => {
    setEditing(null);
    setErrors({});
    setForm(blankManagerProduct(categories[0]?.id || ''));
    setDialog(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setErrors({});
    setForm({ ...blankManagerProduct(product.categoryId), ...product,
      variants:product.variants?.length ? product.variants.map((variant) => ({ ...variant })) : blankManagerProduct().variants,
      images:product.images?.map((image) => ({ ...image })) || [],
      available:product.locationAvailable !== false });
    setDialog(true);
  };

  const saveProduct = async () => {
    const validation = validateStoreManagerProductForm(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true);
    setError('');
    setNotice('');
    let productSaved = false;
    try {
      const payload = toStoreManagerProductPayload(form);
      const stagingPayload = { ...payload, product:{ ...payload.product, status:'DRAFT' } };
      let savedProduct = editing?.id
        ? await updateStoreManagerProduct(editing.id, stagingPayload)
        : await createStoreManagerProduct(stagingPayload);
      productSaved = true;
      const previousVariants = editing?.variants || [];
      const previousImages = editing?.images || [];
      setEditing(savedProduct);
      const syncAssets = async ({ field, rows, previous, create, update, remove, toPayload, isEmpty }) => {
        const retained = new Set();
        for (let index = 0; index < rows.length; index += 1) {
          const row = rows[index];
          if (isEmpty(row)) continue;
          const result = row.id ? await update(row.id, toPayload(row, index)) : await create(savedProduct.id, toPayload(row, index));
          if (result?.id) retained.add(result.id);
          if (!row.id && result?.id) setForm((current) => ({ ...current, [field]:current[field].map((item, itemIndex) => itemIndex === index ? { ...item, id:result.id } : item) }));
        }
        for (const oldItem of previous) if (oldItem.id && !retained.has(oldItem.id)) await remove(oldItem.id);
      };
      await syncAssets({
        field:'variants', rows:form.variants || [], previous:previousVariants,
        create:createVariant, update:updateVariant, remove:deleteVariant,
        toPayload:toStoreManagerVariantPayload,
        isEmpty:(row) => ![row.sku, row.name, row.price].some((value) => String(value ?? '').trim()),
      });
      await syncAssets({
        field:'images', rows:form.images || [], previous:previousImages,
        create:createImage, update:updateImage, remove:deleteImage,
        toPayload:toStoreManagerImagePayload,
        isEmpty:(row) => !String(row.url || '').trim(),
      });
      if (payload.product.status === 'ACTIVE') savedProduct = await updateStoreManagerProduct(savedProduct.id, payload);
      setEditing(null);
      setDialog(false);
      setNotice(editing ? 'Product changes saved.' : 'Product created for your assigned store.');
      try { await reloadProducts(); }
      catch { setError('Product was saved, but the list could not be refreshed. Reload the page to see the latest data.'); }
    } catch (reason) {
      setError(productSaved
        ? `Product details were saved, but a variant or image change failed: ${reason?.message || 'unknown service error'}`
        : reason?.message || 'Product could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!deleting?.id) return;
    setSaving(true);
    setError('');
    try {
      await deleteStoreManagerProduct(deleting.id);
      setNotice('Product deleted from your assigned store.');
      setDeleting(null);
      try { await reloadProducts(); }
      catch { setError('Product was deleted, but the list could not be refreshed. Reload the page to see the latest data.'); }
    } catch (reason) {
      setError(reason?.message || 'Product could not be deleted.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product) => {
    setError('');
    try {
      if (product.managerOwned) await setStoreManagerProductAvailability(product.id, product.locationAvailable === false);
      else await updateStoreProduct(product.storeProductId, { storeId:store.id, storeName:store.name, productId:product.id, available:product.locationAvailable === false, priceOverride:product.priceOverride ?? null });
      try { await reloadProducts(); }
      catch { setError('Availability was saved, but the list could not be refreshed. Reload the page to see the latest data.'); }
    } catch (reason) {
      setError(reason?.message || 'Product availability could not be changed.');
    }
  };

  const visibleProducts = products.filter((product) => `${product.name} ${product.sku} ${product.brand || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const setField = (key, value) => setForm((current) => ({ ...current, [key]:value }));
  const updateAsset = (field, index, key, value) => setForm((current) => ({ ...current, [field]:current[field].map((item, itemIndex) => itemIndex === index ? { ...item, [key]:value } : item) }));

  return <StoreManagerShell active="products" store={store}>
    <Box className="sm-page-title" sx={{ justifyContent:'space-between', gap:2, flexWrap:'wrap' }}>
      <Box><Typography variant="h4">Store Products</Typography><Typography>Manage products assigned only to {store?.name || user?.store || 'your store'}.</Typography></Box>
      <Button variant="contained" onClick={openCreate} disabled={storeLoading || !store?.id || loading}>Create Product</Button>
    </Box>
    {storeError && <Alert severity="warning" sx={{ mb:2 }}>{storeError}</Alert>}
    {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
    {notice && <Alert severity="success" sx={{ mb:2 }}>{notice}</Alert>}
    <Box sx={{ display:'flex', gap:1.5, mb:2, alignItems:'center' }}>
      <TextField label="Search your products" value={query} onChange={(event) => setQuery(event.target.value)} size="small" sx={{ minWidth:280 }}/>
      <Typography color="text.secondary">{visibleProducts.length} products</Typography>
    </Box>
    {loading ? <Box sx={{ display:'flex', justifyContent:'center', p:5 }}><CircularProgress/></Box>
      : visibleProducts.length ? <Box sx={{ display:'grid', gap:1.5 }}>
        {visibleProducts.map((product) => <Box key={product.id} sx={{ display:'flex', alignItems:'center', gap:2, p:2, border:'1px solid #d8e4df', borderRadius:2, bgcolor:'#fff', flexWrap:'wrap' }}>
          {product.images?.[0]?.url && <img src={product.images[0].url} alt="" style={{ width:56, height:56, objectFit:'cover', borderRadius:8 }}/>}
          <Box sx={{ flex:1, minWidth:180 }}><Typography fontWeight={800}>{product.name}</Typography><Typography variant="body2" color="text.secondary">{product.sku} · {product.categoryName || 'Uncategorized'}{product.brand ? ` · ${product.brand}` : ''}</Typography></Box>
          <Chip size="small" label={product.locationAvailable === false ? 'UNAVAILABLE' : product.status}/>
          <Button size="small" variant={product.locationAvailable === false ? 'outlined' : 'contained'} onClick={() => toggleAvailability(product)}>{product.locationAvailable === false ? 'Unavailable' : 'Available'}</Button>
          {product.managerOwned && <><Button size="small" onClick={() => openEdit(product)}>Edit</Button><Button size="small" color="error" onClick={() => setDeleting(product)}>Delete</Button></>}
        </Box>)}
      </Box> : <Typography color="text.secondary" sx={{ p:3 }}>{query ? 'No matching products.' : 'No products yet. Select Create Product to add one to this store.'}</Typography>}

    <Dialog open={dialog} onClose={() => !saving && setDialog(false)} fullWidth maxWidth="md">
      <DialogTitle>{editing ? 'Edit Store Product' : 'Create Store Product'}</DialogTitle>
      <DialogContent sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', sm:'1fr 1fr' }, gap:2, pt:'12px !important' }}>
        <TextField select label="Category" value={form.categoryId || ''} onChange={(event) => setField('categoryId', event.target.value)} error={Boolean(errors.categoryId)} helperText={errors.categoryId}>
          {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        <TextField label="Product name" value={form.name || ''} onChange={(event) => setField('name', event.target.value)} error={Boolean(errors.name)} helperText={errors.name}/>
        <TextField label="SKU" value={form.sku || ''} onChange={(event) => setField('sku', event.target.value)} error={Boolean(errors.sku)} helperText={errors.sku}/>
        {renderProductSuggestion('brand', 'Brand')}
        <TextField label="URL slug (optional)" value={form.slug || ''} onChange={(event) => setField('slug', event.target.value)}/>
        {renderProductSuggestion('subcategory', 'Subcategory')}
        {renderProductSuggestion('pack', 'Pack')}
        {renderProductSuggestion('type', 'Product type')}
        {renderProductSuggestion('shelfLife', 'Shelf life')}
        <TextField select label="Status" value={form.status || 'ACTIVE'} onChange={(event) => setField('status', event.target.value)}>
          <MenuItem value="ACTIVE">Active</MenuItem><MenuItem value="DRAFT">Draft</MenuItem>
        </TextField>
        <TextField label="Description" multiline minRows={2} value={form.description || ''} onChange={(event) => setField('description', event.target.value)} sx={{ gridColumn:{ sm:'1 / -1' } }}/>
        <TextField label="Nutrition" multiline minRows={2} value={form.ingredients || ''} onChange={(event) => setField('ingredients', event.target.value)}/>
        <TextField label="Specifications" multiline minRows={2} value={form.specifications || ''} onChange={(event) => setField('specifications', event.target.value)}/>
        <TextField label="Highlights" multiline minRows={2} value={form.highlights || ''} onChange={(event) => setField('highlights', event.target.value)}/>
        {renderProductSuggestion('tags', 'Tags')}
        <Box sx={{ gridColumn:{ sm:'1 / -1' }, border:'1px solid #d8e4df', borderRadius:2, p:2, display:'grid', gap:1.5 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:1 }}><Typography fontWeight={800}>Variants and prices</Typography><Button size="small" onClick={() => setField('variants', [...(form.variants || []), { sku:'', name:'', attributes:'', price:'', compareAtPrice:'', active:true }])}>Add Variant</Button></Box>
          {errors.variants && <Alert severity="error">{errors.variants}</Alert>}
          {(form.variants || []).map((variant, index) => <Box key={variant.id || `variant-${index}`} sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', sm:'1fr 1fr 1fr 1fr auto' }, gap:1, alignItems:'center' }}>
            <TextField size="small" label="Variant SKU" value={variant.sku || ''} onChange={(event) => updateAsset('variants', index, 'sku', event.target.value)}/>
            <TextField size="small" label="Variant / pack name" value={variant.name || ''} onChange={(event) => updateAsset('variants', index, 'name', event.target.value)}/>
            <TextField size="small" type="number" label="Price" value={variant.price ?? ''} slotProps={{ htmlInput:{ min:0, step:'0.01' } }} onChange={(event) => updateAsset('variants', index, 'price', event.target.value)}/>
            <TextField size="small" type="number" label="Compare-at price" value={variant.compareAtPrice ?? ''} slotProps={{ htmlInput:{ min:0, step:'0.01' } }} onChange={(event) => updateAsset('variants', index, 'compareAtPrice', event.target.value)}/>
            <Box sx={{ display:'flex', alignItems:'center' }}><FormControlLabel control={<Checkbox checked={variant.active !== false} onChange={(event) => updateAsset('variants', index, 'active', event.target.checked)}/>} label="Active"/><Button color="error" size="small" onClick={() => setField('variants', form.variants.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></Box>
            <TextField size="small" label="Variant attributes (JSON or text)" value={variant.attributes || ''} onChange={(event) => updateAsset('variants', index, 'attributes', event.target.value)} sx={{ gridColumn:{ sm:'1 / -1' } }}/>
          </Box>)}
          {form.status !== 'DRAFT' && <Typography variant="caption" color="text.secondary">Active products need at least one active, priced variant.</Typography>}
        </Box>
        <Box sx={{ gridColumn:{ sm:'1 / -1' }, border:'1px solid #d8e4df', borderRadius:2, p:2, display:'grid', gap:1.5 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:1 }}><Typography fontWeight={800}>Product images</Typography><Button size="small" onClick={() => setField('images', [...(form.images || []), { url:'', altText:'' }])}>Add Image</Button></Box>
          {errors.images && <Alert severity="error">{errors.images}</Alert>}
          {(form.images || []).map((image, index) => <Box key={image.id || `image-${index}`} sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', sm:'2fr 1fr auto' }, gap:1, alignItems:'center' }}>
            <TextField size="small" type="url" label="Google Drive image URL" value={image.url || ''} onChange={(event) => updateAsset('images', index, 'url', event.target.value)} placeholder="Paste a Google Drive image link" helperText="Share the image so anyone with the link can view it."/>
            <TextField size="small" label="Alt text" value={image.altText || ''} onChange={(event) => updateAsset('images', index, 'altText', event.target.value)}/>
            <Button color="error" size="small" onClick={() => setField('images', form.images.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
          </Box>)}
        </Box>
        <FormControlLabel control={<Checkbox checked={form.available !== false} onChange={(event) => setField('available', event.target.checked)}/>} label="Available in my store"/>
        {!categories.length && <Alert severity="warning" sx={{ gridColumn:{ sm:'1 / -1' } }}>No catalog categories are available. Ask an administrator to add a category before creating products.</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={() => setDialog(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveProduct} disabled={saving || !categories.length}>{saving ? 'Saving…' : 'Save Product'}</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)}>
      <DialogTitle>Delete store product?</DialogTitle>
      <DialogContent><Typography>This permanently removes “{deleting?.name}” from your store catalog, including its product variants and images. This does not remove products belonging to other stores.</Typography></DialogContent>
      <DialogActions><Button onClick={() => setDeleting(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={removeProduct} disabled={saving}>{saving ? 'Deleting…' : 'Delete Product'}</Button></DialogActions>
    </Dialog>
  </StoreManagerShell>;
};

const StoreProfilePage = ({ mode = 'profile' }) => {
  const { user, setUser, updateCatalogStore } = useContext(AppContext);
  const isPassword = mode === 'change-password';
  const isSettings = mode === 'delivery-settings';
  const needsAssignedStore = profileModeRequiresAssignedStore(mode);
  const { store, setStore, loading, error } = useAssignedStore(user, { enabled:needsAssignedStore });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (store) setForm({ ...store, managerName:store.adminName || user?.name || '', mobile:store.phone || user?.mobile || user?.phone || '', currentPassword:'', newPassword:'', confirmPassword:'' });
  }, [store, user]);
  const change = (key, value) => setForm((current) => ({ ...current, [key]:value }));
  const save = async () => {
    const next = {};
    if (!isPassword && !String(form.name || '').trim()) next.name = 'Store name is required.';
    if (isPassword) Object.assign(next, validateStaffPasswordChange({ ...form, required:true }));
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      let updatedStore = store;
      if (!isPassword) {
        updatedStore = normalizeStore(await updateStore(store.id, {
          ...store,
          ...form,
          adminName: form.managerName,
          phone: form.mobile,
          deliveryEnabled: form.delivery !== 'No',
          pickupEnabled: form.pickup !== 'No',
          isNew: form.storeType === 'New',
          active: form.status !== 'Inactive',
        }));
        collectionStore.upsert('stores', updatedStore);
        clearDeliveryQuoteCache();
        setStore(updatedStore);
        updateCatalogStore(updatedStore);
      }
      const updatedUser = await staffProfileStore.update({ name:form.managerName || user?.name, phone:form.mobile, mobile:form.mobile, email:user?.email, location:updatedStore?.location || user?.location, store:updatedStore?.name || user?.store, storeId:updatedStore?.id || user?.storeId, currentPassword:form.currentPassword, newPassword:form.newPassword, confirmPassword:form.confirmPassword }, user);
      setUser(updatedUser);
      setEditing(false);
      setMessage('Changes saved.');
    } catch (reason) {
      setErrors({ form:reason.message || 'Could not save changes.' });
    }
  };
  const fields = isPassword
    ? [['currentPassword', 'Current Password', 'password'], ['newPassword', 'New Password', 'password'], ['confirmPassword', 'Confirm Password', 'password']]
    : isSettings
      ? [['delivery', 'Delivery Enabled', 'select', ['Yes', 'No']], ['pickup', 'Store Pickup Enabled', 'select', ['Yes', 'No']], ['status', 'Store Status', 'select', ['Active', 'Inactive', 'Temporarily Closed']]]
      : [['name', 'Store Name'], ['storeCode', 'Store Code'], ['description', 'Description', 'textarea'], ['managerName', 'Manager Name'], ['mobile', 'Mobile Number'], ['alternatePhone', 'Alternate Mobile'], ['email', 'Email'], ['doorNumber', 'Door Number'], ['streetName', 'Road / Street'], ['area', 'Area'], ['landmark', 'Landmark'], ['city', 'City'], ['district', 'District'], ['state', 'State'], ['pincode', 'Pincode'], ['latitude', 'Latitude', 'number'], ['longitude', 'Longitude', 'number'], ['gstNumber', 'GST Number'], ['storeType', 'Store Type', 'select', ['New', 'Old']], ['pickup', 'Store Pickup Available', 'select', ['Yes', 'No']], ['delivery', 'Delivery Available', 'select', ['Yes', 'No']], ['status', 'Store Status', 'select', ['Active', 'Inactive', 'Temporarily Closed']]];
  return <StoreManagerShell active={mode === 'delivery-settings' ? 'delivery-settings' : mode === 'change-password' ? 'change-password' : 'profile'} store={store}>
    <Box className="sm-page-title"><Box><Typography variant="h4">{isPassword ? 'Change Password' : isSettings ? 'Delivery Settings' : 'Store Profile'}</Typography><Typography>{store?.name || 'Assigned store'}</Typography></Box>{!isPassword && !isSettings && <Chip label={store?.status || 'Active'} color={store?.status === 'Inactive' ? 'default' : 'success'}/>}</Box>
    {needsAssignedStore && error && <Alert severity="warning">{error}</Alert>}
    {message && <Alert severity="success">{message}</Alert>}
    {profileModeWaitsForAssignedStore(mode, loading, store) ? <Typography>Loading store...</Typography> : <Box className="sm-profile-layout">
      {!isPassword && <section className="sm-profile-hero"><Box className="sm-store-logo">{store.logoUrl ? <SafeProductImage src={store.logoUrl} fallback={logo} alt="Store logo"/> : <StorefrontOutlinedIcon/>}</Box><Box><Typography variant="h5">{store.name || 'Fresh Mart'}</Typography><Typography>{store.id} {store.storeCode ? `/ ${store.storeCode}` : ''}</Typography></Box><Button variant="outlined" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel Edit' : 'Edit Profile'}</Button></section>}
      {!isSettings && !isPassword && <StoreMap store={form} rules={[]} />}
      <section className="sm-form-grid">
        {fields.map(([key, label, type = 'text', options = []]) => <Box key={key}>{type === 'select' ? <Select fullWidth disabled={!editing && !isPassword && !isSettings} value={form[key] || ''} onChange={(event) => change(key, event.target.value)} displayEmpty><MenuItem value="" disabled>{label}</MenuItem>{options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select> : type === 'password' ? <PasswordField fullWidth label={label} autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} disabled={!editing && !isPassword && !isSettings} value={form[key] || ''} onChange={(event) => change(key, event.target.value)} error={Boolean(errors[key])} helperText={errors[key]}/> : <TextField fullWidth label={label} type={type === 'textarea' ? 'text' : type} multiline={type === 'textarea'} minRows={type === 'textarea' ? 3 : undefined} disabled={!editing && !isPassword && !isSettings} value={form[key] || ''} onChange={(event) => change(key, event.target.value)} error={Boolean(errors[key])} helperText={errors[key]}/>}</Box>)}
        {errors.form && <Alert severity="error" sx={{ gridColumn:'1 / -1' }}>{errors.form}</Alert>}
      </section>
      <Box className="sm-actions"><Button variant="contained" onClick={save}>{isPassword ? 'Change Password' : 'Save Changes'}</Button></Box>
    </Box>}
  </StoreManagerShell>;
};

const DeliveryRadiusPage = () => {
  const { user } = useContext(AppContext);
  const { store, setStore, loading, error } = useAssignedStore(user);
  const [rules, setRules] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const storeId = store?.id;
  const ensureCatalogStore = async () => {
    if (!store?.id) throw new Error('Assigned store is required before saving delivery radius.');
    try {
      return await getStore(store.id, { auth:true });
    } catch (reason) {
      if (!isNotFound(reason)) throw reason;
      const stores = await getStores({}, { auth:true });
      const existing = stores.find((item) => item.id === store.id || item.name === store.name);
      if (!existing) throw new Error('Assigned store was not found in Catalog. Contact an administrator before editing delivery radius.', { cause: reason });
      const saved = normalizeStore(existing);
      collectionStore.upsert('stores', saved);
      setStore(saved);
      return saved;
    }
  };
  const loadRules = async () => {
    if (!storeId) return;
    try {
      const catalogStore = await ensureCatalogStore();
      const payload = await getStoreDeliveryZones(catalogStore.id, { auth:true });
      setMessage('');
      setErrors({});
      setRules((payload || []).map((zone) => ({ ...zone, radiusKm:Number(zone.maxRadiusKm), methods:(zone.methods || []).length ? zone.methods : emptyRule(zone.maxRadiusKm).methods })).sort((a, b) => Number(a.radiusKm) - Number(b.radiusKm)));
    } catch (reason) {
      const localRules = collectionStore.list('deliveryZones').filter((zone) => zone.storeId === storeId);
      if (localRules.length) {
        setRules(localRules.map((zone) => ({ ...zone, radiusKm:Number(zone.maxRadiusKm || zone.radiusKm), methods:(zone.methods || []).length ? zone.methods : emptyRule(zone.maxRadiusKm || zone.radiusKm).methods })).sort((a, b) => Number(a.radiusKm) - Number(b.radiusKm)));
        setMessage('');
        setErrors({});
        return;
      }
      setMessage(reason.message && reason.message !== 'Not Found' ? reason.message : '');
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRules().catch((reason) => setMessage(cleanApiMessage(reason, '')));
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeRules = editing ? rules.map((rule) => rule.id === editing.id ? editing : rule).concat(editing.id ? [] : [editing]) : rules;
  const sortedRules = [...activeRules].sort((a, b) => Number(a.radiusKm || a.maxRadiusKm) - Number(b.radiusKm || b.maxRadiusKm));
  const nextRadius = Math.max(0, ...rules.map((rule) => Number(rule.maxRadiusKm || rule.radiusKm || 0))) + (rules.length ? 5 : 3);
  const persistRule = async (rule, payload) => {
    const catalogStore = await ensureCatalogStore();
    if (!rule.id) return createStoreDeliveryZone(catalogStore.id, payload);
    try {
      return await updateStoreDeliveryZone(catalogStore.id, rule.id, payload);
    } catch (reason) {
      if (isNotFound(reason)) return createStoreDeliveryZone(catalogStore.id, payload);
      throw reason;
    }
  };
  const saveRule = async () => {
    setMessage('');
    setErrors({});
    if (!Number.isFinite(Number(store?.latitude)) || !Number.isFinite(Number(store?.longitude))) {
      setErrors({ form:'This store has no saved map pin. Ask an administrator to add the store location before configuring delivery radius.' });
      return;
    }
    const radius = Number(editing.radiusKm ?? editing.maxRadiusKm);
    const duplicate = rules.some((rule) => rule.id !== editing.id && Number(rule.radiusKm || rule.maxRadiusKm) === radius);
    const next = {};
    if (!Number.isFinite(radius) || !(radius > 0)) next.radiusKm = 'Radius must be greater than 0.';
    if (duplicate) next.radiusKm = `A ${radius} KM delivery radius already exists.`;
    const charge = Number(editing.deliveryCharge);
    if (!Number.isFinite(charge) || charge < 0) next.deliveryCharge = 'Enter a delivery charge of 0 or more.';
    if (editing.freeDeliveryAbove !== '' && editing.freeDeliveryAbove != null && (!Number.isFinite(Number(editing.freeDeliveryAbove)) || Number(editing.freeDeliveryAbove) < 0)) next.freeDeliveryAbove = 'Enter a valid free delivery threshold.';
    if (editing.minimumOrder !== '' && editing.minimumOrder != null && (!Number.isFinite(Number(editing.minimumOrder)) || Number(editing.minimumOrder) < 0)) next.minimumOrder = 'Enter a valid minimum order amount.';
    const etaMin = Number(editing.estimatedDeliveryMin);
    const etaMax = Number(editing.estimatedDeliveryMax);
    if (!Number.isInteger(etaMin) || etaMin < 0) next.estimatedDeliveryMin = 'Enter a whole number of minutes.';
    if (!Number.isInteger(etaMax) || etaMax < 0 || etaMax < etaMin) next.estimatedDeliveryMax = 'ETA maximum must be at least the minimum.';
    (editing.methods || []).forEach((method, index) => {
      if (!Number.isFinite(Number(method.deliveryCharge)) || Number(method.deliveryCharge) < 0) next[`method-${index}`] = `${method.deliveryType} charge must be 0 or more.`;
    });
    setErrors(next);
    if (Object.keys(next).length) return;
    const current = rules.find((rule) => rule.id === editing.id);
    const minRadius = current ? Number(current.minRadiusKm || 0) : Number(rules.reduce((max, rule) => Math.max(max, Number(rule.maxRadiusKm || rule.radiusKm || 0)), 0));
    if (radius <= minRadius) {
      setErrors({ radiusKm:`Radius must be greater than the existing ${minRadius} KM coverage.` });
      return;
    }
    const nextZoneStart = current && rules.filter((rule) => rule.id !== current.id && Number(rule.minRadiusKm || 0) > minRadius).reduce((nearest, rule) => Math.min(nearest, Number(rule.minRadiusKm)), Infinity);
    if (Number.isFinite(nextZoneStart) && radius >= nextZoneStart) {
      setErrors({ radiusKm:`Radius must stay below the next zone boundary (${nextZoneStart} KM).` });
      return;
    }
    const merged = [...rules.filter((rule) => rule.id !== editing.id), { ...editing, radiusKm:radius, minRadiusKm:minRadius, maxRadiusKm:radius }].sort((a, b) => Number(a.minRadiusKm) - Number(b.minRadiusKm));
    const normalized = merged;
    try {
      for (const rule of normalized) {
        const payload = {
          minRadiusKm:Number(rule.minRadiusKm),
          maxRadiusKm:Number(rule.maxRadiusKm),
          estimatedDeliveryMin:numberOrNull(rule.estimatedDeliveryMin),
          estimatedDeliveryMax:numberOrNull(rule.estimatedDeliveryMax),
          deliveryCharge:Number(rule.deliveryCharge || 0),
          freeDeliveryAbove:numberOrNull(rule.freeDeliveryAbove),
          minimumOrder:numberOrNull(rule.minimumOrder),
          status:rule.status || 'Active',
          methods:(rule.methods || []).map((method) => ({ ...method, enabled:Boolean(method.enabled), deliveryCharge:Number(method.deliveryCharge || 0), settingsConfiguration:method.settingsConfiguration || '{}' })),
        };
        await persistRule(rule, payload);
      }
      setEditing(null);
      clearDeliveryQuoteCache();
      setMessage('Delivery radius rules saved.');
      await loadRules();
    } catch (reason) {
      setErrors({ form:cleanApiMessage(reason, 'Could not save radius to the database.') });
    }
  };
  const removeRule = async (rule) => {
    setMessage('');
    setErrors({});
    try {
      const catalogStore = await ensureCatalogStore();
      if (rule.id) {
        try {
          await deleteStoreDeliveryZone(catalogStore.id, rule.id);
        } catch (reason) {
          if (!isNotFound(reason)) throw reason;
        }
      }
      clearDeliveryQuoteCache();
      setRules((current) => current.filter((item) => item.id !== rule.id));
      setMessage('Delivery radius deleted.');
      await loadRules();
    } catch (reason) {
      setErrors({ form:cleanApiMessage(reason, 'Could not delete radius from the database.') });
    }
  };
  const updateMethod = (deliveryType, patch) => setEditing((current) => ({ ...current, methods:(current.methods || emptyRule().methods).map((method) => method.deliveryType === deliveryType ? { ...method, ...patch } : method) }));
  return <StoreManagerShell active="delivery-radius" store={store}>
    <Box className="sm-radius-dashboard">
    <Box className="sm-radius-heading"><Box className="sm-radius-heading-icon"><MyLocationOutlinedIcon/></Box><Box><Typography variant="h4">Delivery Radius &amp; Service Area</Typography><Typography>Manage your store's delivery location, radius, and service charges.</Typography></Box><Box className="sm-radius-heading-art"><LocationOnOutlinedIcon/></Box></Box>
    {error && <Alert severity="warning">{error}</Alert>}
    {message && <Alert severity="info">{message}</Alert>}
    {errors.form && <Alert severity="error">{errors.form}</Alert>}
    {loading || !store ? <Typography>Loading delivery radius...</Typography> : <>
    <Box className="sm-radius-metrics">{[
      {label:'Store Location',value:store.location || 'Assigned store',caption:store.name || 'Current store area',icon:<LocationOnOutlinedIcon/>,tone:'green'},
      {label:'Delivery Radius',value:sortedRules.length ? `${Math.max(...sortedRules.map((rule)=>Number(rule.maxRadiusKm||rule.radiusKm||0)))} KM` : 'Not set',caption:'Current delivery range',icon:<MyLocationOutlinedIcon/>,tone:'blue'},
      {label:'Service Area',value:sortedRules.length ? `${(Math.PI*Math.max(...sortedRules.map((rule)=>Number(rule.maxRadiusKm||rule.radiusKm||0)))**2).toFixed(2)} km²` : '0 km²',caption:'Estimated coverage area',icon:<LayersOutlinedIcon/>,tone:'purple'},
      {label:'Active Rules',value:rules.filter((rule)=>rule.status==='Active').length,caption:'Total delivery radius rules',icon:<LocalShippingOutlinedIcon/>,tone:'amber'},
    ].map((item)=><Box className={`sm-radius-metric ${item.tone}`} key={item.label}><Box>{item.icon}</Box><section><small>{item.label}</small><strong>{item.value}</strong><em>{item.caption}</em></section></Box>)}</Box>
    <Box className="sm-radius-layout">
      <Box className="sm-radius-map-panel"><Box className="sm-radius-section-title"><LocationOnOutlinedIcon/><Box><strong>Store Delivery Location</strong><small>Delivery radius is applied from your assigned store pin.</small></Box><Chip label={store.location || 'Assigned store'} size="small"/></Box><StoreMap store={store} rules={rules} editingRule={editing} /></Box>
      <aside className="sm-radius-panel">
        <Box className="sm-radius-rules-title"><Box><StorefrontOutlinedIcon/><Box><strong>Delivery Radius Rules</strong><small>Configure delivery charges, free delivery limit, and estimated time.</small></Box></Box><Button variant="contained" onClick={() => { setErrors({}); setEditing(emptyRule(nextRadius)); }}>+ Add Rule</Button></Box>
        {sortedRules.map((rule, index) => <Box className={`sm-rule-card ${editing === rule ? 'editing' : ''}`} key={rule.id || `draft-${index}`}>
          <Box className="sm-rule-head"><Typography fontWeight={800}>{zoneLabel(rule)}</Typography><Chip label={rule.status || 'Active'} size="small"/></Box>
          <Typography><strong>{money(rule.deliveryCharge)}</strong> Base delivery charge</Typography>
          <Typography color="text.secondary">Free delivery above: {rule.freeDeliveryAbove == null ? 'Not set' : money(rule.freeDeliveryAbove)} · Minimum order: {rule.minimumOrder == null ? 'Not set' : money(rule.minimumOrder)}</Typography>
          <Typography color="text.secondary">{etaLabel(rule)}</Typography>
          <Box className="sm-method-tags">{(rule.methods || []).filter((method) => method.enabled).map((method) => <Chip key={method.deliveryType} label={`${method.deliveryType.replace(' Delivery', '')}: ${money(method.deliveryCharge)}`} size="small"/>)}</Box>
          <Box><Button onClick={() => setEditing({ ...rule, methods:rule.methods || [] })}>Edit</Button><Button color="error" onClick={() => removeRule(rule)}>Delete</Button></Box>
        </Box>)}
        {editing && <Box className="sm-editor">
          <Typography variant="h6">{editing.id ? 'Edit Radius' : 'Add Radius'}</Typography>
          <TextField label="Maximum Radius (km)" type="number" inputProps={{ min:0.1, step:0.1 }} value={editing.radiusKm ?? ''} onChange={(event) => setEditing({ ...editing, radiusKm:event.target.value, maxRadiusKm:event.target.value })} error={Boolean(errors.radiusKm)} helperText={errors.radiusKm || `${editing.id ? `Coverage starts at ${Number(editing.minRadiusKm || 0)} km.` : `Next zone starts at ${Number(rules.reduce((max, rule) => Math.max(max, Number(rule.maxRadiusKm || rule.radiusKm || 0)), 0))} km.`} The map preview updates immediately.`}/>
          <TextField label="Delivery Charge (₹)" type="number" inputProps={{ min:0, step:0.01 }} value={editing.deliveryCharge ?? ''} onChange={(event) => setEditing({ ...editing, deliveryCharge:event.target.value })} error={Boolean(errors.deliveryCharge)} helperText={errors.deliveryCharge || 'Base charge for this radius zone.'}/>
          <TextField label="Free Delivery Above (₹)" type="number" inputProps={{ min:0, step:0.01 }} value={editing.freeDeliveryAbove ?? ''} onChange={(event) => setEditing({ ...editing, freeDeliveryAbove:event.target.value })} error={Boolean(errors.freeDeliveryAbove)} helperText={errors.freeDeliveryAbove || 'Leave blank to disable free delivery.'}/>
          <TextField label="Minimum Order (₹)" type="number" inputProps={{ min:0, step:0.01 }} value={editing.minimumOrder ?? ''} onChange={(event) => setEditing({ ...editing, minimumOrder:event.target.value })} error={Boolean(errors.minimumOrder)} helperText={errors.minimumOrder}/>
          <Box className="sm-two"><TextField label="ETA Min (minutes)" type="number" inputProps={{ min:0, step:1 }} value={editing.estimatedDeliveryMin ?? ''} onChange={(event) => setEditing({ ...editing, estimatedDeliveryMin:event.target.value })} error={Boolean(errors.estimatedDeliveryMin)} helperText={errors.estimatedDeliveryMin}/><TextField label="ETA Max (minutes)" type="number" inputProps={{ min:0, step:1 }} value={editing.estimatedDeliveryMax ?? ''} onChange={(event) => setEditing({ ...editing, estimatedDeliveryMax:event.target.value })} error={Boolean(errors.estimatedDeliveryMax)} helperText={errors.estimatedDeliveryMax}/></Box>
          <Typography fontWeight={800}>Delivery Types</Typography>
          {(editing.methods || emptyRule().methods).map((method, index) => <Box className="sm-method-editor" key={method.deliveryType}><Button variant={method.enabled ? 'contained' : 'outlined'} onClick={() => updateMethod(method.deliveryType, { enabled:!method.enabled })}>{method.deliveryType}</Button><TextField label="Charge (₹)" type="number" inputProps={{ min:0, step:0.01 }} value={method.deliveryCharge ?? ''} onChange={(event) => updateMethod(method.deliveryType, { deliveryCharge:event.target.value })} error={Boolean(errors[`method-${index}`])} helperText={errors[`method-${index}`]}/><TextField label="ETA" value={method.estimatedTime || ''} onChange={(event) => updateMethod(method.deliveryType, { estimatedTime:event.target.value })}/></Box>)}
          <Box className="sm-actions"><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="contained" onClick={saveRule}>Save Radius</Button></Box>
        </Box>}
      </aside>
    </Box></>}
    </Box>
  </StoreManagerShell>;
};

const StoreOrdersPage = () => {
  const { user } = useContext(AppContext);
  const { store } = useAssignedStore(user);
  const { orders: visibleOrders, error } = useManagerOrders(store?.id, user?.id);
  return <StoreManagerShell active="orders" store={store}>
    <Box className="sm-page-title"><Box><Typography variant="h4">Store Orders</Typography><Typography>{store?.name || user?.store}</Typography></Box></Box>
    {error && <Alert severity="error">{error}</Alert>}
    <Box className="sm-orders-list">{visibleOrders.length ? visibleOrders.map((order) => <Box className="sm-order-card" key={order.id}><Box><Typography fontWeight={900}>{order.orderNumber || order.id}</Typography><Typography>Customer: {order.customer?.name || order.customerName || 'Customer'}</Typography><Typography>Distance: {order.calculatedDistanceKm || order.checkout?.deliveryQuote?.distanceKm || '--'} KM</Typography><Typography>Zone: {order.deliveryZoneLabel || (order.checkout?.deliveryQuote?.deliveryZoneId ? `Zone ${order.checkout.deliveryQuote.deliveryZoneId}` : '--')}</Typography></Box><Box><Typography>Delivery: {order.deliveryMethod || order.checkout?.deliveryQuote?.selectedDeliveryMethod || order.checkout?.method || '--'}</Typography><Typography>ETA: {order.estimatedDeliveryMin && order.estimatedDeliveryMax ? `${order.estimatedDeliveryMin}-${order.estimatedDeliveryMax} min` : '--'}</Typography><Typography>Delivery Charge: {money(order.deliveryCharge || order.checkout?.deliveryFee || 0)}</Typography><Typography>Total: {money(order.totalAmount || order.total || 0)}</Typography></Box><Chip label={order.status}/></Box>) : !error && <Typography color="text.secondary">No orders for this store yet.</Typography>}</Box>
  </StoreManagerShell>;
};

const StoreManagerDashboard = () => {
  const { user } = useContext(AppContext);
  const { store } = useAssignedStore(user);
  const { orders: visibleOrders } = useManagerOrders(store?.id, user?.id);
  const orderSummary = summarizeOrders(visibleOrders);
  return <StoreManagerShell active="dashboard" store={store}>
    <Box className="sm-page-title"><Box><Typography variant="h4">Welcome back, {user?.name || 'Store Manager'}</Typography><Typography>{store?.name || user?.store}</Typography></Box></Box>
    <Box className="sm-stat-grid">{[['Orders', orderSummary.total], ['Active Orders', visibleOrders.filter((order) => !['DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled'].includes(order.status)).length], ['Revenue', money(orderSummary.revenue)], ['Store Status', store?.status || 'Active']].map(([label, value]) => <Box className="sm-stat" key={label}><Typography>{label}</Typography><Typography variant="h5">{value}</Typography></Box>)}</Box>
    <Box className="sm-actions"><Button variant="contained" onClick={() => window.location.assign('/store-manager/delivery-radius')}>Manage Delivery Radius</Button><Button variant="outlined" onClick={() => window.location.assign('/store-manager/orders')}>View Orders</Button></Box>
  </StoreManagerShell>;
};

const StoreManagerPortal = ({ page }) => {
  if (page === 'products') return <StoreManagerProductsPage />;
  if (page === 'profile') return <StoreProfilePage />;
  if (page === 'delivery-partners') return <DeliveryPartnersPage />;
  if (page === 'delivery-radius') return <DeliveryRadiusPage />;
  if (page === 'delivery-settings') return <StoreProfilePage mode="delivery-settings" />;
  if (page === 'orders') return <StoreOrdersPage />;
  if (page === 'change-password') return <StoreProfilePage mode="change-password" />;
  return <StoreManagerDashboard />;
};

export default StoreManagerPortal;
