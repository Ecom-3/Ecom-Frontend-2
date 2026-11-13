import { useMemo, useState } from 'react';
import { Alert, Box, Button, MenuItem, Select, TextField, Typography } from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { buildReportExport, calculateStorePerformance, downloadJsonReport, filterReportOrders, reportProductCount, reportStockUnits, summarizeOrders } from './adminReportData.js';
import './AdminReports.css';
import './AdminReportsReference.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const AdminReports = ({ orders, customerTotal, customerError = '', showCustomerMetric = true, locationScope = '', storeScopeId = '', products, storeProductMappings = [], inventory, stores, loading = false, error = '', onRetry }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [location, setLocation] = useState(locationScope || 'All');
  const [store, setStore] = useState('All');
  const [sort, setSort] = useState('revenue');
  const [performanceView, setPerformanceView] = useState('store');
  const [exportMessage, setExportMessage] = useState('');
  const locations = [...new Set(stores.map((item) => item.location).filter(Boolean))].sort();
  const fixedLocation = locationScope ? locations.find((name) => name.trim().toLowerCase() === locationScope.trim().toLowerCase()) || locationScope : '';
  const selectedLocation = locationScope ? fixedLocation : location;
  const selectableStores = stores.filter((item) => (storeScopeId ? String(item.id) === String(storeScopeId) : selectedLocation === 'All' || item.location === selectedLocation))
    .sort((left, right) => left.name.localeCompare(right.name));
  const selectedStore = storeScopeId ? selectableStores[0] : selectableStores.find((item) => item.name.trim().toLowerCase() === store.trim().toLowerCase());
  const effectiveStore = storeScopeId ? selectedStore?.name || '' : store;
  const filtered = filterReportOrders(orders, { from, to, location:selectedLocation, store:effectiveStore });
  const summary = summarizeOrders(filtered);
  const performance = calculateStorePerformance(
    selectableStores.filter((item) => store === 'All' || item.name === store), filtered, sort,
  );
  const performanceRows = performanceView === 'location'
    ? Object.values(performance.reduce((groups, item) => {
      const name = item.location || 'Unassigned';
      groups[name] ||= { name, location: 'Location', orders: 0, revenue: 0 };
      groups[name].orders += item.orders; groups[name].revenue += item.revenue;
      return groups;
    }, {})).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'orders' ? b.orders - a.orders : b.revenue - a.revenue)
    : performance;
  const trends = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const rows = filtered.filter((order) => String(order.createdAt || order.created_at || '').slice(0, 10) === key);
    return { day: date.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }), revenue: rows.reduce((sum, order) => sum + Number(order.totalAmount ?? order.total ?? 0), 0), orders: rows.length };
  }), [filtered]);
  const statusSummary = useMemo(() => {
    const buckets = [{ name: 'Delivered', color: '#08a64d', value: 0 }, { name: 'Created', color: '#1684f5', value: 0 }, { name: 'Processing', color: '#ff9200', value: 0 }, { name: 'Pending', color: '#8a32ef', value: 0 }];
    filtered.forEach((order) => {
      const value = String(order.status || '').toUpperCase();
      if (value === 'DELIVERED') buckets[0].value += 1;
      else if (['CREATED', 'NEW'].includes(value)) buckets[1].value += 1;
      else if (['PROCESSING', 'CONFIRMED', 'PACKING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(value)) buckets[2].value += 1;
      else buckets[3].value += 1;
    });
    return buckets;
  }, [filtered]);
  const reset = () => {
    setFrom(''); setTo(''); setLocation(fixedLocation || 'All'); setStore('All'); setSort('revenue'); setExportMessage('');
  };
  const exportReport = () => {
    try {
      const payload = buildReportExport({ filters: { from, to, location:selectedLocation, store:effectiveStore, sort }, orders: filtered, storePerformance: performance });
      const filename = downloadJsonReport(payload);
      setExportMessage(`Download started: ${filename}. Check your browser downloads.`);
    } catch (error) {
      setExportMessage(`Could not export the report. ${error.message || 'Please try again.'}`);
    }
  };

  if (loading) return <Box className="reports-dashboard"><Alert severity="info">Loading backend order data…</Alert></Box>;
  if (error) return <Box className="reports-dashboard"><Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>{error}</Alert></Box>;

  return <Box className="reports-dashboard">
    <Box className="reports-heading"><Box className="reports-heading-icon"><AssessmentOutlinedIcon /></Box><Box><Typography variant="h5">Reports</Typography><Typography>Analyze business performance, orders, revenue, and store-wise insights.</Typography></Box><Box className="reports-spice-art" aria-hidden="true"><i/><i/><i/></Box></Box>
    <Box className="reports-filters">
      <TextField label="From" type="date" size="small" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="To" type="date" size="small" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      {!storeScopeId && <Select size="small" value={selectedLocation} disabled={Boolean(locationScope)} onChange={(event) => { setLocation(event.target.value); setStore('All'); }}>
        {!locationScope && <MenuItem value="All">All locations</MenuItem>}{locations.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
      </Select>}
      {storeScopeId ? <TextField size="small" label="Assigned store" value={selectedStore?.name || 'Assigned store unavailable'} disabled/> : <Select size="small" value={store} onChange={(event) => setStore(event.target.value)}>
        <MenuItem value="All">All stores in location</MenuItem>{selectableStores.map((item) => <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>)}
      </Select>}
      <Select size="small" value={sort} onChange={(event) => setSort(event.target.value)}>
        <MenuItem value="revenue">Sort stores by revenue</MenuItem><MenuItem value="orders">Sort stores by orders</MenuItem><MenuItem value="name">Sort stores by name</MenuItem>
      </Select>
      <Button onClick={reset}>Reset</Button><Button variant="contained" onClick={exportReport} startIcon={<FileDownloadOutlinedIcon />}>Export JSON</Button>
    </Box>
    {exportMessage && <Alert role="status" severity={exportMessage.startsWith('Could not') ? 'error' : 'success'} sx={{ mt: 1 }}>{exportMessage}</Alert>}
    {filtered.length === 0 && <Alert severity="info" sx={{ mt: 1 }}>No orders match the selected report filters.</Alert>}
    <Box className="reports-kpis">{[
      ['Revenue', money(summary.revenue)], ['Orders', summary.total], ['Delivered', summary.delivered], ...(showCustomerMetric ? [['Customers', customerTotal ?? '—']] : []),
      ['Products', reportProductCount(products, storeProductMappings, selectedStore?.id, Boolean(locationScope || storeScopeId))],
      ['Stock Units', reportStockUnits(inventory, selectedStore?.id, Boolean(locationScope || storeScopeId))],
    ].map(([label, value]) => <Box className="reports-kpi" key={label}><Typography>{label}</Typography><Typography variant="h5">{value}</Typography><small>{label === 'Customers' ? (customerError || 'Registered customer profiles; independent of report filters') : storeScopeId ? selectedStore?.name || 'Assigned store' : store !== 'All' ? store : locationScope ? `All stores in ${locationScope}` : selectedLocation !== 'All' ? selectedLocation : 'All business data'}</small></Box>)}</Box>
    <Box className="reports-chart-grid">
      <Box className="report-card"><Box className="report-title"><Typography variant="h6">Revenue &amp; Orders Trend</Typography><Box className="chart-legend"><span><i/>Revenue</span><span><i/>Orders</span></Box></Box><Box className="trend-recharts"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={trends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#e7efeb" vertical={false}/><XAxis dataKey="day" tick={{ fontSize: 9, fill: '#506079' }} axisLine={{ stroke: '#cfdad5' }} tickLine={false}/><YAxis yAxisId="revenue" tick={{ fontSize: 8, fill: '#506079' }} axisLine={false} tickLine={false} width={36}/><YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 8, fill: '#506079' }} axisLine={false} tickLine={false} width={24}/><ChartTooltip/><Bar yAxisId="revenue" dataKey="revenue" fill="#9be8a9" radius={[4,4,0,0]} barSize={30}/><Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#078b4b" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }}/></ComposedChart></ResponsiveContainer></Box></Box>
      <Box className="report-card"><Box className="report-title"><Typography variant="h6">Orders by Status</Typography></Box><Box className="status-chart-wrap"><Box className="status-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusSummary} dataKey="value" nameKey="name" innerRadius="63%" outerRadius="88%" paddingAngle={2}>{statusSummary.map((entry) => <Cell key={entry.name} fill={entry.color}/>)}</Pie><ChartTooltip/></PieChart></ResponsiveContainer><span><strong>{summary.total}</strong><small>Total Orders</small></span></Box><Box className="status-legend">{statusSummary.map((item) => <div key={item.name}><i style={{ background: item.color }}/><span>{item.name}</span><b>{item.value} ({summary.total ? ((item.value / summary.total) * 100).toFixed(1) : '0.0'}%)</b></div>)}</Box></Box></Box>
    </Box>
    <Box className="report-card reports-store-card" sx={{ mt: 0 }}><Box className="report-title"><Typography variant="h6"><StorefrontOutlinedIcon sx={{ fontSize: 17, verticalAlign: 'middle', mr: .6, color: '#087c50' }} />Store Performance</Typography><Box className="store-view-tabs"><Button variant={performanceView === 'store' ? 'contained' : 'text'} onClick={() => setPerformanceView('store')}>By Store</Button><Button variant={performanceView === 'location' ? 'contained' : 'text'} onClick={() => setPerformanceView('location')}>By Location</Button></Box></Box>
      <Box className="analytics-table"><header><span>#</span><span>{performanceView === 'store' ? 'Store and Location' : 'Location'}</span><span>Orders ↓</span><span>Revenue</span></header>
        {performanceRows.map((item, index) => <div key={item.name}><span>{index + 1}</span><span>{item.name}<small style={{ display: 'block' }}>{performanceView === 'store' ? item.location : ''}</small></span><span>{item.orders}</span><strong>{money(item.revenue)}</strong></div>)}
      </Box>
    </Box>
  </Box>;
};

export default AdminReports;
