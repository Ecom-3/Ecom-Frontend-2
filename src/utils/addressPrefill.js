export const addressFieldsFromLocation = (location = {}) => ({
  street: location.street || location.road || location.area || location.title || '',
  village: location.village || location.locality || location.suburb || location.neighbourhood || '',
  city: location.city || '',
  state: location.state || '',
  pincode: location.pincode || location.postcode || '',
});

export const fillMissingAddressFields = (current, location) => {
  const detected = addressFieldsFromLocation(location);
  return Object.fromEntries(Object.keys(detected).map((key) => [key, current[key] || detected[key]]));
};

export const addressFieldsFromPostalLookup = (postOffice = {}) => ({
  village: postOffice.Block || postOffice.Name || postOffice.Division || '',
  city: postOffice.District || postOffice.Block || '',
  state: postOffice.State || '',
});

export const addressFieldsFromSavedStreet = (street = '') => {
  const parts = String(street).split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return { street: parts.slice(0, -1).join(', '), village: parts.at(-1) };
  return { street: parts[0] || '', village: '' };
};
