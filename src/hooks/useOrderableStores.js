import { useEffect, useState } from 'react';
import { getCachedStoreDeliveryQuote } from '../services/catalogApi';
import { GLOBAL_STORE_LISTING, isGlobalStore, parseDeliveryModes, storeDeliversTo } from '../utils/storeDelivery';

export const useOrderableStores = (stores = [], location = null, hasGlobalProducts = false) => {
  const [orderableStores, setOrderableStores] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const globalStores = stores.filter(isGlobalStore);
    if (hasGlobalProducts && !globalStores.length) globalStores.push(GLOBAL_STORE_LISTING);
    const localStores = stores.filter((store) => storeDeliversTo(store, location));
    setOrderableStores(globalStores);
    if (!Number.isFinite(Number(location?.latitude)) || !Number.isFinite(Number(location?.longitude))) {
      setOrderableStores(globalStores);
      return () => { cancelled = true; };
    }
    Promise.all(localStores.map(async (store) => {
      try {
        const quote = await getCachedStoreDeliveryQuote(store.id, {
          latitude: Number(location.latitude), longitude: Number(location.longitude),
        });
        const hasDeliveryMethod = (quote?.methods || []).some((method) => method.enabled !== false
          && !String(method.deliveryType || '').toLowerCase().includes('pickup'));
        const hasStoreDeliveryMode = parseDeliveryModes(store.deliveryModes).some((mode) => !mode.toLowerCase().includes('pickup'));
        return quote?.deliveryAvailable && hasDeliveryMethod && hasStoreDeliveryMode ? store : null;
      } catch {
        return null;
      }
    })).then((results) => {
      if (!cancelled) setOrderableStores([...results.filter(Boolean), ...globalStores]);
    });
    return () => { cancelled = true; };
  }, [stores, location, hasGlobalProducts]);

  return orderableStores;
};
