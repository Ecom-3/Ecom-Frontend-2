import { useEffect,useRef,useState } from 'react';
import { Box,IconButton,Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SafeProductImage from '../SafeProductImage/SafeProductImage';
import { Link } from 'react-router-dom';

const CampaignCarousel=({banners,gesture=0})=>{
  const [index,setIndex]=useState(0);
  const count=banners.length;
  useEffect(()=>{
    if(count<2) return undefined;
    const timer=setInterval(()=>setIndex((value)=>(value+1)%count),5000);
    return()=>clearInterval(timer);
  },[count]);
  if(!count) return null;
  const safeIndex=((index+gesture)%count+count)%count;
  const banner=banners[safeIndex];
  const configuredTarget=String(banner.targetUrl||'').trim();
  const destination=(()=>{
    if(!configuredTarget) return '';
    if(/^\/(?!\/)/.test(configuredTarget)) return configuredTarget;
    try {
      const url=new URL(configuredTarget);
      if(!['http:','https:'].includes(url.protocol)) return '';
      const host=url.hostname.toLowerCase();
      if(host==='localhost'||host.endsWith('.localhost')||host==='::1'||host==='0.0.0.0'||/^127\./.test(host)) return '';
      return url.toString();
    } catch { return ''; }
  })();
  const external=/^https?:\/\//i.test(destination);
  const move=(step)=>setIndex((value)=>(value+step+count)%count);
return <Box className="home-campaign-carousel" sx={{position:'relative',mx:'4vw',my:1.25,borderRadius:2.5,overflow:'hidden',bgcolor:'#e8f3ee',minHeight:{xs:145,md:175}}}><Box component={destination?(external?'a':Link):'div'} {...(destination?(external?{href:destination,rel:'noopener noreferrer'}:{to:destination}):{})} aria-label={destination?`Browse ${banner.name}`:undefined} sx={{display:'block',color:'inherit',textDecoration:'none',cursor:destination?'pointer':'default','&:focus-visible':{outline:'3px solid #007c58',outlineOffset:-3}}}><SafeProductImage src={banner.mobileImage||banner.image} alt={banner.name} style={{width:'100%',height:'clamp(145px,15vw,190px)',objectFit:'cover',display:'block'}}/><Box sx={{position:'absolute',inset:'auto 0 0',p:{xs:1.5,md:2},color:'white',background:'linear-gradient(transparent,rgba(0,0,0,.72))'}}><Typography variant="h5" fontWeight={800} sx={{fontSize:{xs:16,md:18}}}>{banner.name}</Typography><Typography sx={{fontSize:{xs:10,md:11}}}>{banner.description}</Typography></Box></Box>{count>1&&<><IconButton aria-label="Previous banner" onClick={()=>move(-1)} sx={{position:'absolute',left:12,top:'45%',bgcolor:'rgba(255,255,255,.9)'}}><ChevronLeftIcon/></IconButton><IconButton aria-label="Next banner" onClick={()=>move(1)} sx={{position:'absolute',right:12,top:'45%',bgcolor:'rgba(255,255,255,.9)'}}><ChevronRightIcon/></IconButton><Box sx={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',display:'flex',gap:.75}}>{banners.map((item,dot)=><Box component="button" aria-label={`Show ${item.name}`} key={item.id} onClick={()=>setIndex(dot)} sx={{width:dot===index?22:8,height:8,p:0,border:0,borderRadius:4,bgcolor:dot===index?'white':'rgba(255,255,255,.55)',cursor:'pointer'}}/>)}</Box></>}</Box>;
};
const ScrollableCampaignCarousel = (props) => {
  const start = useRef(null);
  const suppressClick = useRef(false);
  const lastWheel = useRef(0);
  const [gesture, setGesture] = useState(0);
  const move = (step) => setGesture((value) => value + step);
  return <Box sx={{ touchAction: 'pan-y', userSelect: 'none' }}
    onDragStart={(event) => event.preventDefault()}
    onPointerDown={(event) => {
      if (event.target.closest('button')) return;
      suppressClick.current = false;
      start.current = { x: event.clientX, y: event.clientY };
    }}
    onPointerUp={(event) => {
      if (!start.current) return;
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        suppressClick.current = true;
        move(dx < 0 ? 1 : -1);
      }
    }}
    onPointerCancel={() => { start.current = null; }}
    onClickCapture={(event) => {
      if (event.target.closest('button')?.getAttribute('aria-label')?.startsWith('Show ')) setGesture(0);
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    }}
    onWheel={(event) => {
      const delta = event.shiftKey ? event.deltaY : event.deltaX;
      if (Math.abs(delta) < 15 || Date.now() - lastWheel.current < 450) return;
      lastWheel.current = Date.now();
      move(delta > 0 ? 1 : -1);
    }}>
    <CampaignCarousel {...props} gesture={gesture} />
  </Box>;
};
export default ScrollableCampaignCarousel;
