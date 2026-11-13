import { useMemo, useState } from 'react';
import { Box, Button, Checkbox, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import SafeProductImage from '../../components/SafeProductImage/SafeProductImage.jsx';
import { bannerImageFor } from '../../services/categoryImages.js';

const BannerStat = ({ label, value, icon, color, tint, note }) => <Box sx={{display:'flex',alignItems:'center',gap:1,p:1.1,minWidth:0,minHeight:58,border:'1px solid #e5ece8',borderRadius:2,background:`linear-gradient(115deg,${tint},#fff)`}}><Box sx={{width:36,height:36,flexShrink:0,display:'grid',placeItems:'center',borderRadius:1.5,color,bgcolor:`${color}20`}}>{icon}</Box><Box sx={{minWidth:0}}><Typography fontSize={16} fontWeight={850} lineHeight={1.15} noWrap>{value}</Typography><Typography variant="caption" fontSize={10} color="text.secondary" noWrap>{label}{note?` · ${note}`:''}</Typography></Box></Box>;
const prettyDate = (value) => value ? new Date(value).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

export default function AdminBannersPage({ records = [], visibleRecords = [], filteredCount = 0, page = 1, pages = 1, setPage, query, setQuery, statusFilter, setStatusFilter, sort, setSort, onView, onEdit, onToggle, onDelete, onCreate, onExport }) {
  const [selected,setSelected] = useState([]);
  const activeCount = records.filter((record)=>String(record.status||'Active').toLowerCase()==='active').length;
  const inactiveCount = records.length-activeCount;
  const latest = useMemo(()=>records.map((record)=>record.updatedAt||record.createdAt).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0],[records]);
  const allSelected = visibleRecords.length>0&&visibleRecords.every((record)=>selected.includes(String(record.id)));
  const toggleAll = () => setSelected((current)=>allSelected?current.filter((id)=>!visibleRecords.some((record)=>String(record.id)===id)):[...new Set([...current,...visibleRecords.map((record)=>String(record.id))])]);
  const changeFilter = (setter) => (event) => { setter(event.target.value); setPage(1); };

  return <Box className="admin-banners-dashboard" sx={{display:'grid',gap:1.15}}>
    <Box sx={{display:'flex',alignItems:'center',gap:1.2,p:1.1,border:'1px solid #d9eee5',borderRadius:2,background:'linear-gradient(105deg,#eaf8f2,#fff 60%,#fff7eb)'}}><Box sx={{width:42,height:42,flexShrink:0,display:'grid',placeItems:'center',borderRadius:1.5,color:'#087451',bgcolor:'#d8f3e5'}}><ImageOutlinedIcon/></Box><Box><Typography fontSize={21} fontWeight={850} lineHeight={1.2}>Banners</Typography><Typography variant="caption" color="text.secondary">Manage promotional banners for your stores and customer app.</Typography></Box></Box>
    <Box sx={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:1,'@media(max-width:760px)':{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}}>
      <BannerStat label="Total Banners" value={records.length} icon={<ImageOutlinedIcon/>} color="#149d51" tint="#effbf2"/>
      <BannerStat label="Active Banners" value={activeCount} icon={<PlayArrowRoundedIcon/>} color="#784fd0" tint="#f4f0ff"/>
      <BannerStat label="Inactive Banners" value={inactiveCount} icon={<ScheduleOutlinedIcon/>} color="#e76d32" tint="#fff4ee"/>
      <BannerStat label="Latest" value={latest?prettyDate(latest):'—'} note="Updated" icon={<CalendarMonthOutlinedIcon/>} color="#176ed1" tint="#eef6ff"/>
    </Box>
    <Box sx={{p:1.15,border:'1px solid #e1e9e5',borderRadius:2,bgcolor:'#fff',boxShadow:'0 4px 16px rgba(12,66,48,.045)'}}>
      <Box sx={{display:'flex',alignItems:'center',gap:.75,flexWrap:'wrap',mb:.9}}>
        <TextField size="small" placeholder="Search by banner title..." value={query} onChange={(event)=>{setQuery(event.target.value);setPage(1);}} sx={{flex:'1 1 240px','& .MuiInputBase-input':{py:.8,fontSize:11}}}/>
        <Select size="small" value={statusFilter} onChange={changeFilter(setStatusFilter)} sx={{minWidth:115,fontSize:11}}><MenuItem value="All">All Status</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></Select>
        <Select size="small" value={sort} onChange={changeFilter(setSort)} sx={{minWidth:105,fontSize:11}}><MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="name">Name</MenuItem></Select>
        {onExport&&<Button onClick={onExport} sx={{ml:'auto'}}>Export</Button>}{onCreate&&<Button variant="contained" onClick={onCreate} startIcon={<ImageOutlinedIcon/>}>Create Banner</Button>}
      </Box>
      <Box sx={{width:'100%',overflowX:'auto'}}><Box component="table" sx={{width:'100%',minWidth:720,borderCollapse:'separate',borderSpacing:'0 3px','& th':{p:.8,color:'#fff',textAlign:'left',fontSize:10,whiteSpace:'nowrap',bgcolor:'#075b40'},'& th:first-of-type':{borderRadius:'8px 0 0 8px'},'& th:last-of-type':{borderRadius:'0 8px 8px 0'},'& td':{px:.8,py:.6,borderBottom:'1px solid #edf1ef',fontSize:10,verticalAlign:'middle'}}}>
        <Box component="thead"><Box component="tr"><Box component="th" sx={{width:38}}><Checkbox size="small" checked={allSelected} onChange={toggleAll} sx={{color:'#fff','&.Mui-checked':{color:'#fff'}}}/></Box>{['Banner','Title','Status','Created At','Actions'].map((label)=><Box component="th" key={label}>{label}</Box>)}</Box></Box>
        <Box component="tbody">{visibleRecords.map((record)=>{const active=String(record.status||'Active').toLowerCase()==='active';return <Box component="tr" key={record.id} sx={{'&:hover':{bgcolor:'#f7fbf9'}}}><Box component="td"><Checkbox size="small" checked={selected.includes(String(record.id))} onChange={()=>setSelected((current)=>current.includes(String(record.id))?current.filter((id)=>id!==String(record.id)):[...current,String(record.id)])}/></Box><Box component="td" sx={{width:220}}><SafeProductImage src={record.image||record.imageUrl||bannerImageFor(record)} alt={record.name||'Banner'} style={{display:'block',width:220,height:52,objectFit:'cover',borderRadius:6,background:'#f3f7f5'}}/></Box><Box component="td" sx={{maxWidth:0}}><Tooltip title={record.name||record.title||'Untitled banner'}><Typography fontSize={11} fontWeight={800} noWrap sx={{maxWidth:250,overflow:'hidden',textOverflow:'ellipsis'}}>{record.name||record.title||'Untitled banner'}</Typography></Tooltip></Box><Box component="td"><Chip size="small" label={record.status||'Active'} icon={<Box component="span" sx={{width:7,height:7,borderRadius:'50%',bgcolor:active?'#078444':'#bd1e1e'}}/>} sx={{height:22,fontSize:9,fontWeight:800,color:active?'#087443':'#a51616',bgcolor:active?'#def6e6':'#ffe3e3','& .MuiChip-icon':{ml:.75,mr:-.4}}}/></Box><Box component="td"><Box sx={{display:'flex',alignItems:'center',gap:.45}}><CalendarMonthOutlinedIcon sx={{fontSize:14,color:'#617083'}}/><Typography variant="caption" color="text.secondary">{prettyDate(record.createdAt)}</Typography></Box></Box><Box component="td" sx={{whiteSpace:'nowrap'}}><Tooltip title="View banner"><IconButton size="small" onClick={()=>onView(record)}><VisibilityOutlinedIcon sx={{fontSize:16}}/></IconButton></Tooltip>{onEdit&&<Tooltip title="Edit banner"><IconButton size="small" onClick={()=>onEdit(record)}><EditOutlinedIcon sx={{fontSize:16}}/></IconButton></Tooltip>}{onToggle&&<Tooltip title={active?'Deactivate':'Activate'}><IconButton size="small" onClick={()=>onToggle(record)} sx={{color:'#087451',bgcolor:'#f1f7f4'}}><PowerSettingsNewOutlinedIcon sx={{fontSize:16}}/></IconButton></Tooltip>}{onDelete&&<Tooltip title="Delete banner"><IconButton size="small" onClick={()=>onDelete(record)} sx={{color:'#bd3438',bgcolor:'#fff0f0'}}><DeleteOutlineOutlinedIcon sx={{fontSize:16}}/></IconButton></Tooltip>}</Box></Box>})}{!visibleRecords.length&&<Box component="tr"><Box component="td" colSpan={6} sx={{py:4,textAlign:'center',color:'#68776f'}}>No banners match these filters.</Box></Box>}</Box>
      </Box></Box>
      <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mt:.7,px:.3}}><Typography variant="caption" color="text.secondary">Showing {filteredCount?(page-1)*6+1:0}–{Math.min(page*6,filteredCount)} of {filteredCount} banners</Typography><Box sx={{display:'flex',alignItems:'center'}}><IconButton size="small" disabled={page<=1} onClick={()=>setPage(page-1)}><KeyboardArrowLeftOutlinedIcon/></IconButton><Button size="small" sx={{minWidth:28,bgcolor:'#087451',color:'#fff'}}>{page}</Button><IconButton size="small" disabled={page>=pages} onClick={()=>setPage(page+1)}><KeyboardArrowRightOutlinedIcon/></IconButton></Box></Box>
    </Box>
  </Box>;
}
