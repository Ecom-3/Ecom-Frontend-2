import { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, FormControl, MenuItem, Select, Typography } from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage';
import { getLowStockInventory } from './adminDashboardData.js';
import { openStreetMapEmbedUrl } from '../../services/openStreetMapService.js';

const STATUS_COLORS = ['#17a85a', '#1184e8', '#8757e8', '#f29b22', '#36b34a', '#e84d5b'];
const asDate = (record) => {
  const value = record?.createdAt || record?.createdDate || record?.orderDate || record?.date;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const orderProduct = (order) => order.items?.[0]?.title || order.items?.[0]?.name || 'Customer order';
const DashboardMetric = ({ label, value, icon, color, background, compact = false }) => <Box sx={{ minWidth: 0, minHeight: compact ? 64 : 78, display: 'flex', alignItems: 'center', gap: 1.15, p: compact ? 1.15 : 1.5, border: `1px solid ${color}22`, borderRadius: 2, background: `linear-gradient(112deg,${background},#fff)` }}><Box sx={{ width: compact ? 35 : 40, height: compact ? 35 : 40, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: `${color}19`, color, '& svg': { fontSize: compact ? 19 : 22 } }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography variant="caption" sx={{ color: '#42534b', fontSize: 11, fontWeight: 650 }}>{label}</Typography><Typography sx={{ fontSize: compact ? 18 : 22, lineHeight: 1.1, fontWeight: 850, color: '#172d23' }}>{value}</Typography></Box></Box>;
const Panel = ({ children, sx = {} }) => <Box sx={{ minWidth: 0, p: 1.5, border: '1px solid #e0e9e5', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 14px rgba(15,74,52,.045)', ...sx }}>{children}</Box>;
const PanelHeading = ({ icon, title, action }) => <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.2 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: .75, minWidth: 0, '& svg': { color: '#087451', fontSize: 19 } }}>{icon}<Typography fontWeight={800} noWrap sx={{ fontSize: 14 }}>{title}</Typography></Box>{action}</Box>;

export default function AdminDashboardPage({ user, orders = [], products = [], inventory = [], stores = [], locations = [], customerTotal, customerError = '', ordersError = '', inventoryError = '', metricsLoaded = false, canViewCustomers = false, orderTotal = () => 0, onViewOrders, onViewInventory, onViewStores, onViewLocations }) {
  const [range, setRange] = useState('30');
  const [today] = useState(() => new Date());
  const startDate = useMemo(() => range === 'all' ? null : new Date(today.getTime() - Number(range) * 24 * 60 * 60 * 1000), [range, today]);
  const rangeOrders = useMemo(() => orders.filter((order) => {
    if (!startDate) return true;
    const date = asDate(order);
    return !date || date >= startDate;
  }), [orders, startDate]);
  const deliveredOrders = rangeOrders.filter((order) => ['DELIVERED', 'COMPLETED'].includes(String(order.status || '').toUpperCase()));
  const cancelledOrders = rangeOrders.filter((order) => String(order.status || '').toUpperCase() === 'CANCELLED');
  const createdOrders = rangeOrders.filter((order) => ['CREATED', 'NEW'].includes(String(order.status || '').toUpperCase()));
  const revenue = rangeOrders.filter((order) => !['CANCELLED', 'REJECTED'].includes(String(order.status || '').toUpperCase())).reduce((total, order) => total + Number(orderTotal(order) || 0), 0);
  const statuses = ['Created', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const statusCounts = statuses.map((label) => ({ label, value: rangeOrders.filter((order) => String(order.status || '').replaceAll('_', ' ').toLowerCase() === label.toLowerCase()).length }));
  const chartData = useMemo(() => {
    const byDate = new Map();
    rangeOrders.forEach((order) => {
      const date = asDate(order);
      if (!date) return;
      const key = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      byDate.set(key, (byDate.get(key) || 0) + Number(orderTotal(order) || 0));
    });
    return [...byDate.entries()].map(([date, total]) => ({ date, total })).slice(-12);
  }, [rangeOrders, orderTotal]);
  const lowStock = useMemo(() => getLowStockInventory(inventory).slice(0, 5), [inventory]);
  const locationCount = new Set([...locations, ...stores.map((store) => store.location)].map((value) => typeof value === 'string' ? value.trim().toLowerCase() : String(value?.name || '').trim().toLowerCase()).filter(Boolean)).size;
  const storeWithMapPoint = stores.find((store) => Number.isFinite(Number(store.latitude)) && Number.isFinite(Number(store.longitude)));
  const mapUrl = storeWithMapPoint ? openStreetMapEmbedUrl({ lat: Number(storeWithMapPoint.latitude), lng: Number(storeWithMapPoint.longitude) }) : '';
  const recentOrders = [...rangeOrders].sort((a, b) => (asDate(b)?.getTime() || 0) - (asDate(a)?.getTime() || 0)).slice(0, 5);
  const metricValue = (value, error = '') => !metricsLoaded || error ? '—' : Number(value || 0).toLocaleString('en-IN');

  return <Box sx={{ display: 'grid', gap: 1.15 }}>
    {(ordersError || customerError) && <Alert severity="error">{ordersError || `Customer metric unavailable: ${customerError}`}</Alert>}
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: -.25 }}><FormControl size="small"><Select value={range} onChange={(event) => setRange(event.target.value)} sx={{ minWidth: 140, bgcolor: '#fff', fontSize: 12, '& .MuiSelect-select': { py: .8 } }}><MenuItem value="7">Last 7 Days</MenuItem><MenuItem value="30">Last 30 Days</MenuItem><MenuItem value="90">Last 90 Days</MenuItem><MenuItem value="all">All Time</MenuItem></Select></FormControl></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 1.2, '@media(max-width:900px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }}>
      <DashboardMetric label="Total Orders" value={metricValue(rangeOrders.length, ordersError)} icon={<ShoppingCartOutlinedIcon/>} color="#159c55" background="#effcf3"/>
      <DashboardMetric label="Created Orders" value={metricValue(createdOrders.length, ordersError)} icon={<HistoryOutlinedIcon/>} color="#1279de" background="#f0f7ff"/>
      <DashboardMetric label="Completed Orders" value={metricValue(deliveredOrders.length, ordersError)} icon={<CheckCircleOutlineOutlinedIcon/>} color="#7851df" background="#f6f2ff"/>
      <DashboardMetric label="Cancelled Orders" value={metricValue(cancelledOrders.length, ordersError)} icon={<CancelOutlinedIcon/>} color="#db4555" background="#fff2f3"/>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 1.1, '@media(max-width:1100px)': { gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }, '@media(max-width:620px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }}>
      {canViewCustomers && <DashboardMetric compact label="Customers" value={metricValue(customerTotal, customerError)} icon={<PeopleAltOutlinedIcon/>} color="#159c55" background="#f1fcf4"/>}
      <DashboardMetric compact label="Products" value={metricValue(products.length)} icon={<Inventory2OutlinedIcon/>} color="#159c75" background="#effbf7"/>
      <DashboardMetric compact label="Stores" value={metricValue(stores.length)} icon={<StorefrontOutlinedIcon/>} color="#1279de" background="#f1f8ff"/>
      <DashboardMetric compact label="Locations" value={metricValue(locationCount)} icon={<LocationOnOutlinedIcon/>} color="#7851df" background="#f7f4ff"/>
      <DashboardMetric compact label="Low Stock" value={metricValue(inventoryError ? 0 : lowStock.length, inventoryError)} icon={<WarningAmberOutlinedIcon/>} color="#e78924" background="#fff8ee"/>
      <DashboardMetric compact label="Revenue" value={metricsLoaded && !ordersError ? money(revenue) : '—'} icon={<AssessmentOutlinedIcon/>} color="#139957" background="#f0fbf4"/>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: '2.1fr 1.25fr 1fr', gap: 1.2, '@media(max-width:1100px)': { gridTemplateColumns: '1fr 1fr' }, '@media(max-width:700px)': { gridTemplateColumns: '1fr' } }}>
      <Panel sx={{ minHeight: 220 }}><PanelHeading icon={<AssessmentOutlinedIcon/>} title="Revenue Overview" action={<Box sx={{ textAlign: 'right' }}><Typography variant="caption" color="text.secondary">Total Revenue</Typography><Typography fontWeight={850} sx={{ lineHeight: 1 }}>{metricsLoaded && !ordersError ? money(revenue) : '—'}</Typography></Box>}/>{!metricsLoaded || ordersError ? <Typography color="text.secondary" sx={{ py: 5 }}>Revenue chart unavailable until authorized order data is available.</Typography> : chartData.length ? <ResponsiveContainer width="100%" height={155}><AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#19a45a" stopOpacity={.27}/><stop offset="100%" stopColor="#19a45a" stopOpacity={.02}/></linearGradient></defs><CartesianGrid stroke="#eaf0ed" vertical={false}/><XAxis dataKey="date" tick={{ fontSize: 9, fill: '#718078' }} axisLine={false} tickLine={false}/><YAxis width={38} tick={{ fontSize: 9, fill: '#718078' }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`}/><Tooltip formatter={(value) => money(value)}/><Area type="monotone" dataKey="total" stroke="#12994f" strokeWidth={2.5} fill="url(#revenueFill)" dot={{ r: 2, fill: '#12994f' }} activeDot={{ r: 4 }}/></AreaChart></ResponsiveContainer> : <Typography color="text.secondary" sx={{ py: 5 }}>No dated revenue data for this period.</Typography>}</Panel>
      <Panel sx={{ minHeight: 220 }}><PanelHeading icon={<Inventory2OutlinedIcon/>} title="Order Status"/>{!metricsLoaded || ordersError ? <Typography color="text.secondary" sx={{ py: 5 }}>Order status metrics unavailable.</Typography> : <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: .5 }}><Box sx={{ position: 'relative', height: 155 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusCounts} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">{statusCounts.map((entry, index) => <Cell key={entry.label} fill={STATUS_COLORS[index]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><Box sx={{ position: 'absolute', inset: 0, display: 'grid', alignContent: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center' }}><Typography fontWeight={850}>{rangeOrders.length}</Typography><Typography variant="caption" color="text.secondary">Total Orders</Typography></Box></Box><Box sx={{ display: 'grid', gap: .55 }}>{statusCounts.map((entry, index) => <Box key={entry.label} sx={{ display: 'flex', alignItems: 'center', gap: .7, fontSize: 10 }}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: STATUS_COLORS[index] }}/><Typography variant="caption" sx={{ flex: 1, fontSize: 10 }}>{entry.label}</Typography><Typography variant="caption" fontWeight={700}>{entry.value}</Typography></Box>)}</Box></Box>}</Panel>
      <Panel sx={{ minHeight: 220 }}><PanelHeading icon={<StorefrontOutlinedIcon/>} title="Store & Location Overview"/>{onViewStores?<Button fullWidth onClick={onViewStores} sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 1, color: '#253b30' }}><StorefrontOutlinedIcon sx={{ mr: 1, color: '#159c55' }}/><Box sx={{ flex: 1 }}><Typography fontWeight={750} fontSize={12}>{stores.length} Stores</Typography><Typography variant="caption" color="text.secondary">Across all assigned locations</Typography></Box><ArrowForwardOutlinedIcon fontSize="small"/></Button>:<Box sx={{display:'flex',alignItems:'center',px:1,py:.7}}><StorefrontOutlinedIcon sx={{mr:1,color:'#159c55'}}/><Typography fontWeight={750} fontSize={12}>{stores.length} Stores</Typography></Box>}{onViewLocations?<Button fullWidth onClick={onViewLocations} sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 1, color: '#253b30' }}><LocationOnOutlinedIcon sx={{ mr: 1, color: '#159c55' }}/><Box sx={{ flex: 1 }}><Typography fontWeight={750} fontSize={12}>{locationCount} Locations</Typography><Typography variant="caption" color="text.secondary">Serviceable areas</Typography></Box><ArrowForwardOutlinedIcon fontSize="small"/></Button>:<Box sx={{display:'flex',alignItems:'center',px:1,py:.7}}><LocationOnOutlinedIcon sx={{mr:1,color:'#159c55'}}/><Typography fontWeight={750} fontSize={12}>{locationCount} Locations</Typography></Box>}{mapUrl ? <Box sx={{ height: 78, mt: .5, overflow: 'hidden', borderRadius: 1, position: 'relative' }}><iframe title="Store location overview map" src={mapUrl} style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}/><Typography sx={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', px: 1, borderRadius: 1, bgcolor: '#fff', fontSize: 10, fontWeight: 800 }}>{storeWithMapPoint.name}</Typography></Box> : <Box sx={{ height: 78, mt: .5, borderRadius: 1, display: 'grid', placeItems: 'center', color: '#087451', bgcolor: 'linear-gradient(125deg,#edf7f0,#e9f2ee)', backgroundImage: 'radial-gradient(#5b9e7d 1.5px,transparent 1.5px)', backgroundSize: '23px 23px' }}><LocationOnOutlinedIcon/></Box>}</Panel>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 1.2, '@media(max-width:900px)': { gridTemplateColumns: '1fr' } }}>
      <Panel>
        <PanelHeading icon={<ShoppingCartOutlinedIcon/>} title="Recent Orders" action={onViewOrders && <Button size="small" onClick={onViewOrders}>View All <ArrowForwardOutlinedIcon sx={{ fontSize: 15, ml: .3 }}/></Button>}/>
        {!metricsLoaded ? <Typography color="text.secondary" py={3}>Loading order data...</Typography>
          : ordersError ? <Typography color="error" py={3}>Order data unavailable for this account.</Typography>
            : recentOrders.length ? <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', minWidth: 550, borderCollapse: 'collapse', '& th': { textAlign: 'left', fontSize: 10, color: '#66766e', fontWeight: 700, p: .8 }, '& td': { p: .8, borderTop: '1px solid #edf1ef', fontSize: 10 } }}>
                <Box component="thead"><Box component="tr">{['Order ID', 'Product', 'Store', 'Location', 'Status', 'Amount'].map((heading) => <Box component="th" key={heading}>{heading}</Box>)}</Box></Box>
                <Box component="tbody">{recentOrders.map((order) => <Box component="tr" key={order.id}>
                  <Box component="td" sx={{ fontWeight: 700 }}>{order.orderNumber || String(order.id || '').slice(0, 12)}</Box>
                  <Box component="td">{orderProduct(order)}</Box>
                  <Box component="td">{order.store || order.storeName || '—'}</Box>
                  <Box component="td">{order.location || order.city || '—'}</Box>
                  <Box component="td"><Chip size="small" label={order.status || 'CREATED'} sx={{ height: 20, fontSize: 9, bgcolor: '#e8f5ec', color: '#087443', fontWeight: 750 }}/></Box>
                  <Box component="td" sx={{ fontWeight: 800 }}>{money(orderTotal(order))}</Box>
                </Box>)}</Box>
              </Box>
            </Box> : <Typography color="text.secondary" py={3}>No orders yet.</Typography>}
      </Panel>
      <Panel><PanelHeading icon={<WarningAmberOutlinedIcon sx={{ color: "#e78924 !important" }}/>} title="Low Stock Products" action={onViewInventory && <Button size="small" onClick={onViewInventory}>View Inventory <ArrowForwardOutlinedIcon sx={{ fontSize: 15, ml: .3 }}/></Button>}/>{inventoryError ? <Typography color="error" py={3}>{inventoryError}</Typography> : lowStock.length ? <Box sx={{ display: "grid" }}>{lowStock.map((item) => <Box key={item.id} sx={{ display: "grid", gridTemplateColumns: "34px minmax(110px,1fr) minmax(100px,1fr) minmax(80px,1fr) auto", alignItems: "center", gap: .75, py: .8, borderTop: "1px solid #edf1ef" }}><SafeProductImage src={item.productImage||item.image} alt="" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 5 }}/><Typography fontSize={10} fontWeight={700} noWrap>{item.name}</Typography><Typography variant="caption" noWrap>{item.store||"—"}</Typography><Typography variant="caption" noWrap>{item.location||"—"}</Typography><Chip size="small" color="warning" label={`${item.stock} left`} sx={{ height: 20, fontSize: 9, fontWeight: 750 }}/></Box>)}</Box> : <Typography color="text.secondary" py={3}>Inventory looks healthy.</Typography>}</Panel>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right" }}>Viewing {user?.store || user?.location || "all assigned locations"}</Typography>
  </Box>;
}
