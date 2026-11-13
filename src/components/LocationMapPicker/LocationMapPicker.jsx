import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeOpenStreetMap, reverseGeocodeOpenStreetMap } from '../../services/openStreetMapService';
import './LocationMapPicker.css';

const INDIA_VIEW = [20.5937, 78.9629];
const validPoint = (lat, lng) => Number.isFinite(Number(lat)) && Number(lat) >= -90 && Number(lat) <= 90
  && Number.isFinite(Number(lng)) && Number(lng) >= -180 && Number(lng) <= 180;
const pin = L.divIcon({ className: 'location-map-pin-wrap', html: '<span class="location-map-pin"></span>', iconSize: [24, 24], iconAnchor: [12, 12] });

const addressSummary = (place) => [place?.address, place?.city, place?.state, place?.pincode, place?.country].filter(Boolean).join(', ');

export default function LocationMapPicker({ latitude, longitude, onCoordinatesChange, onApplyAddress }) {
  const mapHost = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const onApplyAddressRef = useRef(onApplyAddress);
  const placePointRef = useRef(null);
  const selectedPointRef = useRef(null);
  const reverseTimer = useRef(null);
  const lookupSequence = useRef(0);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const placePoint = useCallback((lat, lng, { pan = true, lookup = false } = {}) => {
    if (!validPoint(lat, lng)) return;
    const point = [Number(lat), Number(lng)];
    selectedPointRef.current = point;
    const lookupId = ++lookupSequence.current;
    clearTimeout(reverseTimer.current);
    setSuggestion(null);
    const map = mapRef.current;
    if (map) {
      if (!markerRef.current) {
        markerRef.current = L.marker(point, { draggable: true, icon: pin }).addTo(map);
        markerRef.current.on('dragend', (event) => {
          const moved = event.target.getLatLng();
          placePointRef.current?.(moved.lat, moved.lng, { pan: false, lookup: true });
        });
      }
      else markerRef.current.setLatLng(point);
      if (pan) map.setView(point, Math.max(map.getZoom(), 15));
      setTimeout(() => map.invalidateSize(), 0);
    }
    onCoordinatesChangeRef.current(String(point[0]), String(point[1]));
    setConfirmed(false);
    setError('');
    if (lookup) {
      reverseTimer.current = setTimeout(async () => {
        setBusy(true);
        try {
          const place = await reverseGeocodeOpenStreetMap(point[0], point[1]);
          if (lookupId !== lookupSequence.current) return;
          setSuggestion(place);
          if (place) onApplyAddressRef.current?.({ ...place, lat: point[0], lng: point[1], provider: 'OPENSTREETMAP' });
        } catch (lookupError) {
          if (lookupId === lookupSequence.current) {
            setSuggestion(null);
            setError(`${lookupError.message || 'Could not look up an address for this point.'} You can still use the coordinates.`);
          }
        } finally {
          if (lookupId === lookupSequence.current) setBusy(false);
        }
      }, 700);
    }
  }, []);

  useEffect(() => { onCoordinatesChangeRef.current = onCoordinatesChange; }, [onCoordinatesChange]);
  useEffect(() => { onApplyAddressRef.current = onApplyAddress; }, [onApplyAddress]);
  useEffect(() => { placePointRef.current = placePoint; }, [placePoint]);

  useEffect(() => {
    if (!mapHost.current || mapRef.current) return undefined;
    const map = L.map(mapHost.current, { scrollWheelZoom: true }).setView(INDIA_VIEW, 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    const selectMapPoint = (event) => {
      const { lat: selectedLat, lng: selectedLng } = event.latlng;
      placePointRef.current?.(selectedLat, selectedLng, { pan: false, lookup: true });
    };
    map.on('click', selectMapPoint);
    const resize = () => map.invalidateSize();
    const observer = new ResizeObserver(resize);
    observer.observe(mapHost.current);
    const modalResize = setTimeout(resize, 250);
    return () => {
      clearTimeout(modalResize);
      clearTimeout(reverseTimer.current);
      map.off('click', selectMapPoint);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Create/reposition the marker when opening an edit form or typing coordinates.
  useEffect(() => {
    if (latitude === '' || latitude == null || longitude === '' || longitude == null) return;
    if (!validPoint(latitude, longitude) || !mapRef.current) return;
    const point = [Number(latitude), Number(longitude)];
    const previousPoint = selectedPointRef.current;
    if (previousPoint && Math.abs(previousPoint[0] - point[0]) < 1e-8 && Math.abs(previousPoint[1] - point[1]) < 1e-8) return;
    selectedPointRef.current = point;
    if (!markerRef.current) {
      markerRef.current = L.marker(point, { draggable: true, icon: pin }).addTo(mapRef.current);
      markerRef.current.on('dragend', (event) => {
        const moved = event.target.getLatLng();
        placePointRef.current?.(moved.lat, moved.lng, { pan: false, lookup: true });
      });
    } else markerRef.current.setLatLng(point);
    mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), 15));
    mapRef.current.invalidateSize();
  }, [latitude, longitude]);

  const search = async () => {
    const text = query.trim();
    if (!text) { setError('Enter an address, area, city, or pincode to search.'); return; }
    setBusy(true); setError(''); setSuggestion(null);
    try {
      const result = await geocodeOpenStreetMap(text);
      if (!result) { setError('No matching address found. Try adding the city or pincode.'); return; }
      placePoint(result.lat, result.lng, { lookup: false });
      setSuggestion(result); onApplyAddressRef.current?.({ ...result, lat: Number(result.lat), lng: Number(result.lng), provider: 'OPENSTREETMAP' });
    } catch (lookupError) {
      setError(lookupError.message || 'Address search failed. Please try again shortly.');
    } finally { setBusy(false); }
  };

  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoordinates = validPoint(latitude, longitude) && latitude !== '' && longitude !== '';

  return <Box className="location-map-picker">
    <Typography variant="subtitle1" fontWeight={800}>Verify Location on Map</Typography>
    <Typography variant="body2" color="text.secondary">Search for a place, click the map, or drag the marker to set the exact store location. Address details will fill from the selected point when available; you can edit any field manually.</Typography>
    <Box className="location-map-search">
      <TextField fullWidth size="small" label="Search address, area, city, or pincode" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} />
      <Button variant="outlined" onClick={search} disabled={busy}>{busy ? <CircularProgress size={19} /> : 'Search'}</Button>
    </Box>
    <Box className="location-map-canvas" ref={mapHost} role="application" aria-label="Select location on map" />
    <Box className="location-map-coordinates">
      <Typography variant="body2"><b>Latitude:</b> {hasCoordinates ? lat.toFixed(6) : 'Not set'} &nbsp; <b>Longitude:</b> {hasCoordinates ? lng.toFixed(6) : 'Not set'}</Typography>
      <Button size="small" variant="text" disabled={!hasCoordinates} onClick={() => mapRef.current?.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15))}>Reset to selected location</Button>
    </Box>
    {suggestion && <Box className="location-map-suggestion">
      <Box><Typography variant="caption" color="text.secondary">Suggested address</Typography><Typography variant="body2">{addressSummary(suggestion) || suggestion.subtitle || `${suggestion.lat}, ${suggestion.lng}`}</Typography></Box>
      {onApplyAddress && <Button size="small" onClick={() => { onApplyAddress(suggestion); setConfirmed(true); }}>Use suggested address</Button>}
    </Box>}
    {error && <Typography color="error" variant="body2">{error}</Typography>}
    {!hasCoordinates && (latitude || longitude) && <Typography color="error" variant="body2">Enter a complete coordinate pair within latitude −90 to 90 and longitude −180 to 180.</Typography>}
    <Box className="location-map-confirm-row">
      <Button variant="contained" disabled={!hasCoordinates} onClick={() => { placePoint(lat, lng, { pan: false, lookup: true }); setConfirmed(true); }}>Use This Location</Button>
      {confirmed && <Typography color="success.main" variant="body2">Coordinates selected and ready to save.</Typography>}
    </Box>
  </Box>;
}
