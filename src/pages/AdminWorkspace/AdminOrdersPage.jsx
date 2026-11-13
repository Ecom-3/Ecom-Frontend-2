import { useMemo, useState } from 'react';
import { Box, Button, Checkbox, IconButton, Menu, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';

const normalize = (value) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
const Metric = ({ title, value, icon, color, tint, note }) => <Box sx={{ minWidth:0,minHeight:58,p:1.05,display:'flex',alignItems:'center',gap:1,border:`1px solid ${color}22`,borderRadius:2,background:`linear-gradient(115deg,${tint},#fff)` }}><Box sx={{width:36,height:36,flexShrink:0,borderRadius:1.5,display:'grid',placeItems:'center',color,bgcolor:`${color}20`,'& svg':{fontSize:20}}}>{icon}</Box><Box sx={{minWidth:0}}><Typography fontSize={16} fontWeight={850} sx={{lineHeight:1.1}} noWrap>{value}</Typography><Typography variant="caption" fontSize={10} fontWeight={700} noWrap>{title}</Typography>{note&&<Typography variant="caption" fontSize={9} display="block" color="text.secondary" noWrap>{note}</Typography>}</Box></Box>;
const timestamp = (record) => record.createdAt || record.orderDate || record.created || '';
const orderName = (record) => record.orderNumber || record.id || 'Order';
const statusTone = (status) => ['CANCELLED', 'REJECTED'].includes(normalize(status)) ? ['#b4232e', '#ffeaec'] : normalize(status) === 'DELIVERED' ? ['#087443', '#e3f6e8'] : normalize(status) === 'CREATED' ? ['#1473bd', '#e7f2ff'] : ['#825408', '#fff3dc'];

export default function AdminOrdersPage({ records = [], statuses = [], stores = [], userRole = '', loading = false, error = '', message = '', onView, onFetch, onStatusChange, onAccept, onReject, onAssign, onWorkflow, onExport, canAssign = true }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('newest');
  const [storeFilter,setStoreFilter] = useState('All Stores');
  const [dateRange,setDateRange] = useState('All Dates');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [actionAnchor,setActionAnchor] = useState(null);
  const [actionRecord,setActionRecord] = useState(null);
  const pageSize = 8;
  const filtered = useMemo(() => records.filter((record) => {
    const search = query.trim().toLowerCase();
    const searchable = [record.id, record.orderNumber, record.store, record.storeName, record.location, record.city, record.customerName, record.customer?.name, record.items?.map((item) => item.title || item.name).join(' ')].join(' ').toLowerCase();
    const recordStore=String(record.storeId||record.store||record.storeName||'');
    const selectedStore=stores.find((store)=>String(store.id)===storeFilter);
    const matchesStore=storeFilter==='All Stores'||recordStore===storeFilter||String(record.storeName||'')===storeFilter||(selectedStore&&(recordStore===String(selectedStore.name)||String(record.storeName||'')===String(selectedStore.name)));
    const dateValue=timestamp(record)?new Date(timestamp(record)):null;
    const today=new Date();today.setHours(0,0,0,0);
    const start=new Date(today);
    if(dateRange==='Today'){}else if(dateRange==='Last 7 Days')start.setDate(today.getDate()-6);else if(dateRange==='Last 30 Days')start.setDate(today.getDate()-29);else if(dateRange==='This Month')start.setDate(1);
    const matchesDate=dateRange==='All Dates'||(dateValue&&dateValue>=start&&dateValue<=new Date());
    return (!search || searchable.includes(search)) && (status === 'All' || normalize(record.status) === normalize(status)) && matchesStore && matchesDate;
  }).sort((a, b) => sort === 'oldest' ? String(timestamp(a)).localeCompare(String(timestamp(b))) : sort === 'amount' ? Number(a.totalAmount || a.total || 0) - Number(b.totalAmount || b.total || 0) : String(timestamp(b)).localeCompare(String(timestamp(a)))), [records, query, status, sort, storeFilter, dateRange]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalAmount = (record) => Number(record.totalAmount ?? record.total ?? record.amount ?? 0);
  const totalRevenue = records.filter((record) => !['CANCELLED', 'REJECTED'].includes(normalize(record.status))).reduce((sum, record) => sum + totalAmount(record), 0);
  const created = records.filter((record) => normalize(record.status) === 'CREATED').length;
  const delivered = records.filter((record) => ['DELIVERED', 'COMPLETED'].includes(normalize(record.status))).length;
  const allVisibleSelected = visible.length > 0 && visible.every((record) => selected.includes(String(record.id)));
  const toggleAll = () => setSelected((current) => allVisibleSelected ? current.filter((id) => !visible.some((record) => String(record.id) === id)) : [...new Set([...current, ...visible.map((record) => String(record.id))])]);
  const resetPage = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const formatDate = (record) => { const date = timestamp(record); return date ? {day:new Date(date).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'}),time:new Date(date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} : {day:'—',time:''}; };
  const isGlobal = (record) => record.fulfillmentType === 'global' || record.storeId === 'global-store' || record.store === 'global-store' || record.globalOrder === true;
  const mayChangeStatus = (record) => !isGlobal(record) || userRole === 'global-admin';

  return <Box className="admin-orders-dashboard" sx={{ display: 'grid', gap: 1.1 }}>
    {(error || message) && <Box role="status" sx={{ p: 1, borderRadius: 1, color: error ? '#a32626' : '#075f43', bgcolor: error ? '#fff0f0' : '#edf8f1', fontSize: 12 }}>{error || message}</Box>}
    <Box sx={{display:'flex',alignItems:'center',gap:1.3,p:1.05,border:'1px solid #d9eee5',borderRadius:2,background:'linear-gradient(105deg,#eaf8f2,#fff 62%,#fff7eb)'}}><Box sx={{width:42,height:42,flexShrink:0,display:'grid',placeItems:'center',borderRadius:1.5,color:'#087451',bgcolor:'#d8f3e5'}}><ShoppingBagOutlinedIcon/></Box><Box sx={{minWidth:140}}><Typography fontSize={21} fontWeight={850} lineHeight={1.2}>Orders</Typography><Typography variant="caption" color="text.secondary">Manage and track customer orders across all stores.</Typography></Box><Box sx={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:.8,flex:1,'@media(max-width:900px)':{gridTemplateColumns:'repeat(2,minmax(0,1fr))'},'@media(max-width:650px)':{display:'none'}}}><Metric title="Total Orders" value={records.length.toLocaleString('en-IN')} icon={<ShoppingBagOutlinedIcon/>} color="#149d51" tint="#effbf2" note="All order statuses"/><Metric title="Created Orders" value={created.toLocaleString('en-IN')} icon={<HistoryOutlinedIcon/>} color="#176ed1" tint="#eef6ff" note="Awaiting confirmation"/><Metric title="Completed Orders" value={delivered.toLocaleString('en-IN')} icon={<CheckCircleOutlineOutlinedIcon/>} color="#7650cf" tint="#f4f0ff" note="Delivered to customer"/><Metric title="Total Revenue" value={formatMoney(totalRevenue)} icon={<AttachMoneyOutlinedIcon/>} color="#e89b20" tint="#fff7e8" note="From all orders"/></Box></Box>
    <Box sx={{ p: 1.2, border: '1px solid #e1e9e5', borderRadius: 2, bgcolor: '#fff', boxShadow: '0 4px 16px rgba(12,66,48,.045)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, flexWrap: 'wrap', mb: 1.15 }}>
        <TextField size="small" placeholder="Search order ID, customer, store or location..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}  sx={{ flex: '1 1 250px', '& .MuiInputBase-input': { py: 1.1, fontSize: 11 } }}/>
        <Select size="small" value={storeFilter} onChange={resetPage(setStoreFilter)} sx={{minWidth:120,fontSize:11}}><MenuItem value="All Stores">All Stores</MenuItem>{stores.map((store)=><MenuItem key={store.id||store.name} value={String(store.id||store.name)}>{store.name||store.id}</MenuItem>)}</Select>
        <Select size="small" value={status} onChange={resetPage(setStatus)} sx={{ minWidth: 120, fontSize: 11 }}><MenuItem value="All">All Status</MenuItem>{statuses.filter((item) => item !== 'All').map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
        <Select size="small" value={dateRange} onChange={resetPage(setDateRange)} sx={{ minWidth: 130, fontSize: 11 }}><MenuItem value="All Dates">Select Date Range</MenuItem><MenuItem value="Today">Today</MenuItem><MenuItem value="Last 7 Days">Last 7 Days</MenuItem><MenuItem value="Last 30 Days">Last 30 Days</MenuItem><MenuItem value="This Month">This Month</MenuItem></Select>
        <Select size="small" value={sort} onChange={resetPage(setSort)} sx={{ minWidth: 100, fontSize: 11 }}><MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="amount">Amount</MenuItem></Select>
        <Button variant="outlined" onClick={() => onFetch(query)} disabled={!query.trim() || loading}>Fetch Order</Button>
        {onExport&&<Button onClick={onExport}>Export</Button>}
      </Box>
      <Box sx={{ overflowX: 'hidden',width:'100%' }}><Box component="table" className="admin-orders-table" sx={{ width: '100%', minWidth: 0, tableLayout:'fixed', borderCollapse: 'separate', borderSpacing: '0 3px', '& th': { p: .8, color: '#fff', textAlign: 'left', fontSize: 10, whiteSpace: 'nowrap', bgcolor: '#075b40' }, '& th:first-of-type': { borderRadius: '8px 0 0 8px' }, '& th:last-of-type': { borderRadius: '0 8px 8px 0' }, '& td': { px: .7, py: .55, borderBottom: '1px solid #edf1ef', fontSize: 10, verticalAlign: 'middle',overflow:'hidden' } }}>
        <Box component="thead"><Box component="tr"><Box component="th" sx={{ width: 34 }}><Checkbox size="small" checked={allVisibleSelected} onChange={toggleAll} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}/></Box>{['Order ID', 'Items', 'Customer', 'Store', 'Total', 'Status', 'Order Date', 'Actions'].map((heading) => <Box component="th" key={heading}>{heading}</Box>)}</Box></Box>
        <Box component="tbody">{visible.map((record) => {
          const [ink, tint] = statusTone(record.status);
          const global = isGlobal(record);
          const isCreated = normalize(record.status) === 'CREATED';
          return <Box component="tr" key={record.id} sx={{ bgcolor: global ? '#fffbf1' : '#fff', outline: global ? '1px solid #e1b94f' : 'none', '&:hover': { bgcolor: global ? '#fff6df' : '#f7fbf9' } }}>
            <Box component="td"><Checkbox size="small" checked={selected.includes(String(record.id))} onChange={() => setSelected((current) => current.includes(String(record.id)) ? current.filter((id) => id !== String(record.id)) : [...current, String(record.id)])}/></Box>
            <Box component="td" sx={{minWidth:0}}><Typography fontSize={10} fontWeight={850} noWrap title={orderName(record)}>{orderName(record)}</Typography><Typography variant="caption" color="text.secondary" noWrap>{record.paymentMethod || record.source || 'Order'}</Typography></Box>
            <Box component="td" sx={{minWidth:0}}><Typography fontSize={10} fontWeight={700} noWrap title={record.items?.[0]?.title || record.items?.[0]?.name}>{record.items?.[0]?.title || record.items?.[0]?.name || `${record.items?.length || 0} items`}</Typography><Typography variant="caption" color="text.secondary">{record.items?.length || 0} line items</Typography></Box>
            <Box component="td"><Typography fontSize={10} noWrap>{record.customerName || record.customer?.name || record.name || 'Customer'}</Typography></Box>
            <Box component="td"><Box sx={{ display: 'flex', alignItems: 'center', gap: .4,minWidth:0 }}><StorefrontOutlinedIcon sx={{ fontSize: 14, color: '#087451',flexShrink:0 }}/><Typography variant="caption" noWrap title={record.store || record.storeName}>{record.store || record.storeName || '—'}</Typography></Box>{global&&<Typography variant="caption" color="#946c11">Global order</Typography>}</Box>
            <Box component="td" sx={{ fontWeight: 850, whiteSpace: 'nowrap' }}>{formatMoney(totalAmount(record))}</Box>
            <Box component="td"><Select size="small" value={record.status || 'CREATED'} onChange={(event) => onStatusChange(record, event.target.value)} disabled={!mayChangeStatus(record)} sx={{ fontSize: 9, height: 24, minWidth: 82, '& .MuiSelect-select': { py: .35, bgcolor: tint }, color: ink }}><MenuItem value={record.status || 'CREATED'}>{record.status || 'CREATED'}</MenuItem>{statuses.filter((item) => item !== 'All' && normalize(item) !== normalize(record.status)).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></Box>
            <Box component="td" sx={{minWidth:0}}><Box sx={{display:'flex',alignItems:'center',gap:.3}}><CalendarMonthOutlinedIcon sx={{fontSize:14,flexShrink:0}}/><Box sx={{minWidth:0}}><Typography variant="caption" display="block" noWrap>{formatDate(record).day}</Typography><Typography variant="caption" display="block" color="text.secondary" noWrap>{formatDate(record).time}</Typography></Box></Box></Box>
            <Box component="td" sx={{ whiteSpace: 'nowrap' }}><Tooltip title="View order"><IconButton size="small" onClick={() => onView(record)}><VisibilityOutlinedIcon sx={{ fontSize: 16 }}/></IconButton></Tooltip><Tooltip title="Order actions"><IconButton size="small" onClick={(event)=>{setActionAnchor(event.currentTarget);setActionRecord(record);}}><MoreVertOutlinedIcon sx={{fontSize:18}}/></IconButton></Tooltip></Box>
          </Box>;
        })}{!visible.length&&<Box component="tr"><Box component="td" colSpan={9} sx={{ py: 5, textAlign: 'center', color: '#68776f' }}>{loading ? 'Loading orders...' : 'No orders match these filters.'}</Box></Box>}</Box>
      </Box></Box>
      <Menu anchorEl={actionAnchor} open={Boolean(actionAnchor)} onClose={()=>{setActionAnchor(null);setActionRecord(null);}}>{actionRecord&&<><MenuItem onClick={()=>{onView(actionRecord);setActionAnchor(null);}}>View order</MenuItem>{normalize(actionRecord.status)==='CREATED'&&<MenuItem onClick={()=>{onAccept(actionRecord);setActionAnchor(null);}}>Accept order</MenuItem>}{canAssign&&<MenuItem onClick={()=>{onAssign(actionRecord);setActionAnchor(null);}}>Assign delivery partner</MenuItem>}{onWorkflow&&['CONFIRMED','PROCESSING'].includes(normalize(actionRecord.status))&&<><MenuItem onClick={()=>{onWorkflow(actionRecord,'PACKING');setActionAnchor(null);}}>Mark packing</MenuItem><MenuItem onClick={()=>{onWorkflow(actionRecord,'READY');setActionAnchor(null);}}>Mark ready</MenuItem><MenuItem onClick={()=>{onWorkflow(actionRecord,'SHIP');setActionAnchor(null);}}>Ship order</MenuItem></>}{onWorkflow&&normalize(actionRecord.status)==='SHIPPED'&&<><MenuItem onClick={()=>{onWorkflow(actionRecord,'OUT_FOR_DELIVERY');setActionAnchor(null);}}>Out for delivery</MenuItem><MenuItem onClick={()=>{onWorkflow(actionRecord,'DELIVER');setActionAnchor(null);}}>Mark delivered</MenuItem></>}{!['CANCELLED','REJECTED','DELIVERED'].includes(normalize(actionRecord.status))&&<MenuItem sx={{color:'error.main'}} onClick={()=>{onReject(actionRecord);setActionAnchor(null);}}>Reject order</MenuItem>}</>}</Menu>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: .3 }}><Typography variant="caption" color="text.secondary">Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} orders · {formatMoney(totalRevenue)} active revenue</Typography><Box sx={{ display: 'flex', alignItems: 'center' }}><IconButton size="small" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><KeyboardArrowLeftOutlinedIcon/></IconButton><Button size="small" sx={{ minWidth: 28, bgcolor: '#087451', color: '#fff' }}>{safePage}</Button><IconButton size="small" disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
    </Box>
  </Box>;
}
