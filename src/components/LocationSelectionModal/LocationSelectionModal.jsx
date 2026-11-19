import { useContext, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogContent, Divider, IconButton, Typography } from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { AppContext } from '../../context/AppContext';
import GoogleLocationPicker from '../GoogleLocationPicker/GoogleLocationPicker';

import './LocationSelectionModal.css';

const cleanText = (value) => String(value || '').split(',').map((part) => part.trim()).filter((part) => part && !/^(undefined|null)$/i.test(part)).join(', ').replace(/\s+/g, ' ').trim();

export default function LocationSelectionModal() {
  const { showLocationModal, setShowLocationModal, saveSelectedLocation, addresses, orderAddresses, selectedLocation } = useContext(AppContext);
  const [selected, setSelected] = useState(selectedLocation || null);
  const [error, setError] = useState('');

  const savedOptions = useMemo(() => {
    const seen = new Set();
    return [...(addresses || []), ...(orderAddresses || [])].reduce((list, entry) => {
      const address = cleanText(entry.address);
      const latitude = Number(entry.coordinates?.lat ?? entry.latitude);
      const longitude = Number(entry.coordinates?.lng ?? entry.longitude);
      const key = address.toLowerCase();
      if (!key || seen.has(key) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return list;
      seen.add(key);
      list.push({ ...entry, title: entry.type || 'Saved address', address, latitude, longitude, coordinates: { lat: latitude, lng: longitude }, source: 'manual' });
      return list;
    }, []).slice(0, 3);
  }, [addresses, orderAddresses]);

  const close = () => { sessionStorage.removeItem('locationPickerManualOpen'); setSelected(selectedLocation || null); setError(''); setShowLocationModal(false); };
  const save = (place) => {
    try {
      sessionStorage.removeItem('locationPickerManualOpen');
      saveSelectedLocation({ ...place, address: cleanText(place.address || place.subtitle), city: cleanText(place.city), title: cleanText(place.title), pincode: cleanText(place.pincode) });
    } catch (reason) { setError(reason.message || 'Your browser could not save this location.'); }
  };



  return <Dialog open={showLocationModal} onClose={close} aria-labelledby="choose-location-title" className="choose-location-dialog" fullWidth maxWidth="lg">
    <DialogContent>
      <IconButton className="choose-location-close" aria-label="Close location popup" onClick={close}><CloseIcon /></IconButton>
      <Box className="choose-location-heading"><Box className="choose-location-icon"><LocationOnOutlinedIcon /></Box>
      <Typography id="choose-location-title" component="h2">Select delivery location</Typography>
      <Typography id="choose-location-description">Search, use GPS, or choose from your saved addresses to set your delivery address.</Typography></Box>
      {error && <Alert severity="warning" sx={{ my: 1 }}>{error}</Alert>}
      <Box className="choose-location-layout">
        <Box className="choose-location-saved-panel" role="group" aria-label="Your saved addresses">
          <Box className="choose-location-tabs"><Button startIcon={<LocationOnOutlinedIcon/>}>Saved Addresses</Button><Button startIcon={<HistoryOutlinedIcon/>} onClick={() => document.querySelector('.choose-location-map-panel .google-location-input')?.focus()}>Search Address</Button></Box>
          <Box className="choose-location-saved"><Typography component="h3">Deliver to a saved address</Typography><Box className="choose-location-saved-list">{savedOptions.map((entry, index) => <Button key={entry.id || `${entry.address}-${index}`} fullWidth variant="outlined" className={selected?.address === entry.address ? 'selected' : ''} onClick={() => setSelected(entry)}>{entry.fromOrder ? <HistoryOutlinedIcon fontSize="small" /> : <LocationOnOutlinedIcon fontSize="small" />}<span className="choose-location-saved-text"><strong>{entry.type || 'Home'}</strong><span>{entry.address}</span></span><span className="choose-location-radio"/></Button>)}</Box>{!savedOptions.length && <Typography className="choose-location-empty">No saved addresses yet. Choose a location on the map.</Typography>}</Box>
          <Divider>OR</Divider><Button className="choose-location-add" variant="outlined" onClick={() => { sessionStorage.setItem('locationPickerManualOpen', 'true'); setShowLocationModal(false); window.location.assign('/address-form'); }}>＋ Add New Address</Button>
        </Box>
        <Box className="choose-location-map-panel"><GoogleLocationPicker value={selected} onChange={setSelected} showConfirm={false} /></Box>
      </Box>
      <Button className="choose-location-confirm" fullWidth variant="contained" disabled={!selected} onClick={() => save(selected)}>Confirm Location</Button>
    </DialogContent>
  </Dialog>;
}



