export function adminLocationLookupOptions(locations = [], stores = []) {
  const names = new Map();
  const addName = (value) => {
      const name = String(value ?? '').trim();
      if (!name || /^(null|undefined)$/i.test(name)) return;
      const key = name.normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase();
      if (!names.has(key)) names.set(key, name.replace(/\s+/g, ' '));
  };
  (Array.isArray(locations) ? locations : []).forEach((record) => {
    if (typeof record === 'string') addName(record);
    else [record?.name, record?.city, record?.location, record?.locationName].forEach(addName);
  });
  (Array.isArray(stores) ? stores : []).forEach((store) => {
    [store?.location, store?.locationName, store?.city].forEach(addName);
  });
  return [...names.values()].sort((left, right) => left.localeCompare(right));
}
