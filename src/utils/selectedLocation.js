const STORAGE_KEY = 'metaarch.selectedDeliveryLocation';
const loadStoredLocation = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!value) return null;
    const normalized = {
      ...value,
      latitude: Number(value.latitude ?? value.coordinates?.lat),
      longitude: Number(value.longitude ?? value.coordinates?.lng),
    };
    return validLocation(normalized) ? normalized : null;
  } catch { return null; }
};
export const validLocation = (value) => Boolean(value &&
  ['manual', 'gps'].includes(value.source) &&
  ((typeof value.city === 'string' && value.city.trim()) || (typeof value.address === 'string' && value.address.trim()) || (typeof value.title === 'string' && value.title.trim())) &&
  Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
  Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
);

let selectedLocation = typeof window === 'undefined' ? null : loadStoredLocation();

export const readSelectedLocation = () => selectedLocation;

export const storeSelectedLocation = (value) => {
  if (!validLocation(value)) throw new Error('Please enter a valid location.');
  selectedLocation = value;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* Keep this selection for the current page session. */ }
};

export const clearSelectedLocation = () => {
  selectedLocation = null;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Location is already cleared in memory. */ }
};
