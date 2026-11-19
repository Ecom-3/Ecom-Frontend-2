import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { getBrowserLocation, loadGoogleMaps, normalizeGoogleResult, reverseGeocodeLocation } from '../../services/googleMapsService';
import './GoogleLocationPicker.css';

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 };

const pointFor = (location) => {
  const lat = Number(location?.latitude ?? location?.coordinates?.lat);
  const lng = Number(location?.longitude ?? location?.coordinates?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : DEFAULT_CENTER;
};

export default function GoogleLocationPicker({
  value,
  onChange,
  autoLocate = false,
  autoFocusSearch = false,
  confirmLabel = 'Confirm Location',
  onConfirm,
  showConfirm = true,
}) {
  const mapNode = useRef(null);
  const autocompleteNode = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const active = useRef(true);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [localSelection, setSelection] = useState(value || null);
  const selection = value || localSelection;

  const applyPlace = (place, coordinates, source = 'manual') => {
    const next = { ...normalizeGoogleResult(place, coordinates), source };
    setSelection(next);
    onChange?.(next);
    mapRef.current?.panTo(coordinates);
    mapRef.current?.setZoom(17);
    markerRef.current?.setPosition(coordinates);
    setError('');
  };

  const reverseGeocodeWithOpenStreetMap = async (coordinates, source = 'manual') => {
    setGeocoding(true);
    setError('');
    try {
      const place = await reverseGeocodeLocation(coordinates.lat, coordinates.lng);
      if (!active.current) return;
      const next = { ...place, source };
      setSelection(next);
      onChange?.(next);
      mapRef.current?.panTo(coordinates);
      mapRef.current?.setZoom(17);
      markerRef.current?.setPosition(coordinates);
      setError('');
    } catch (reason) {
      if (active.current) setError(reason.message || 'The selected point could not be converted to an address.');
    } finally {
      if (active.current) setGeocoding(false);
    }
  };

  const locate = async () => {
    setLocating(true);
    setError('');
    try {
      const coordinates = await getBrowserLocation();
      if (!active.current) return;
      await reverseGeocodeWithOpenStreetMap(coordinates, 'gps');
    } catch (reason) {
      const message = reason?.code === 1
        ? 'Location permission was denied. Search for an address or select a point on the map.'
        : reason?.code === 3
          ? 'Location request timed out. Search manually or try again.'
          : reason.message || 'Current location is unavailable.';
      if (active.current) setError(message);
    } finally {
      if (active.current) setLocating(false);
    }
  };

  useEffect(() => {
    active.current = true;
    let autocompleteListener;

    loadGoogleMaps().then(async (maps) => {
      if (!active.current) return;
      const [{ Map: GoogleMap }, { Marker }, { PlaceAutocompleteElement }] = await Promise.all([
        maps.importLibrary('maps'),
        maps.importLibrary('marker'),
        maps.importLibrary('places'),
      ]);
      if (!active.current) return;

      const center = pointFor(value);
      const map = new GoogleMap(mapNode.current, {
        center,
        zoom: value ? 17 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      const marker = new Marker({ map, position: center, draggable: true, title: 'Delivery location' });
      const input = new PlaceAutocompleteElement({ includedRegionCodes: ['in'] });
      input.placeholder = 'Search address, place or pincode';
      input.className = 'google-location-input';
      autocompleteNode.current.replaceChildren(input);

      mapRef.current = map;
      markerRef.current = marker;

      map.addListener('click', (event) => reverseGeocodeWithOpenStreetMap({ lat: event.latLng.lat(), lng: event.latLng.lng() }));
      marker.addListener('dragend', (event) => reverseGeocodeWithOpenStreetMap({ lat: event.latLng.lat(), lng: event.latLng.lng() }));
      const selectPlace = async ({ placePrediction }) => {
        setGeocoding(true);
        try {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'] });
          if (!active.current) return;
          if (!place.location) throw new Error('This search result has no map location.');
          applyPlace({ place_id: place.id, name: place.displayName, formatted_address: place.formattedAddress, address_components: (place.addressComponents || []).map(component => ({ types: component.types, long_name: component.longText })) }, { lat: place.location.lat(), lng: place.location.lng() });
        } catch (reason) {
          if (active.current) setError(reason.message || 'The selected address could not be loaded.');
        } finally { if (active.current) setGeocoding(false); }
      };
      const requestError = () => setError('Address search is unavailable. Check that Places API (New) is enabled for this Google Maps key.');
      input.addEventListener('gmp-select', selectPlace);
      input.addEventListener('gmp-error', requestError);
      autocompleteListener = { remove: () => { input.removeEventListener('gmp-select', selectPlace); input.removeEventListener('gmp-error', requestError); } };

      setLoading(false);
      if (autoFocusSearch) requestAnimationFrame(() => input.focus());
      if (autoLocate && !value) locate();
    }).catch((reason) => {
      if (!active.current) return;
      setLoading(false);
      setError(reason.message || 'Google Maps could not be loaded.');
    });

    return () => {
      active.current = false;
      autocompleteListener?.remove?.();
      markerRef.current?.setMap(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value) return;
    const point = pointFor(value);
    mapRef.current?.panTo(point);
    markerRef.current?.setPosition(point);
  }, [value]);

  return <Box className="google-location-picker">
    <Box ref={autocompleteNode} className="google-location-search" aria-label="Search delivery location" />
    <Box className="google-location-map-wrap">
      <Box ref={mapNode} className="google-location-map" aria-label="Google Map delivery location selector" />
      {loading && <Box className="google-location-loading"><CircularProgress size={26} /><Typography>Loading Google Maps...</Typography></Box>}
      <Button className="google-location-current" variant="contained" startIcon={<MyLocationIcon />} disabled={locating || loading} onClick={locate}>{locating ? 'Locating...' : 'Use current location'}</Button>
    </Box>
    {error && <Alert severity="error">{error}</Alert>}
    {selection && <Box className="google-location-address"><Typography fontWeight={800}>{selection.title || 'Selected location'}</Typography><Typography>{selection.address || selection.subtitle}</Typography>{geocoding && <Typography variant="caption">Updating address...</Typography>}{selection.provider === 'OPENSTREETMAP' && <Typography variant="caption" component="a" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Address lookup © OpenStreetMap contributors</Typography>}</Box>}
    {showConfirm && onConfirm && <Button fullWidth variant="contained" disabled={!selection || geocoding || loading} onClick={() => onConfirm(selection)}>{confirmLabel}</Button>}
  </Box>;
}
