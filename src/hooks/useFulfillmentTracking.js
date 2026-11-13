import { useCallback, useEffect, useState } from 'react';
import { getFulfillmentByOrderId, getShipmentByOrderId, getTrackingEvents, isFulfillmentNotFound, normalizeFulfillment, normalizeShipment, normalizeTrackingEvent } from '../services/fulfillmentApi';
import { isGlobalOrder } from '../services/orderApi';

export const useFulfillmentTracking = (orderId, order) => {
  const [fulfillment, setFulfillment] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!orderId || ['DELIVERED', 'CANCELLED'].includes(order?.status) || ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(shipment?.status)) return undefined;
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [orderId, order?.status, shipment?.status, refresh]);

  useEffect(() => {
    let ignore = false;
    const message = (error) => isFulfillmentNotFound(error) ? '' : 'Delivery updates could not be loaded. Please retry.';
    Promise.resolve().then(async () => {
      if (ignore) return;
      if (refreshKey === 0) {
        setFulfillment(null);
        setShipment(null);
        setTrackingEvents([]);
      }
      setErrors({});
      if (!orderId || !order) { setLoading({}); return; }
      const globalPending = isGlobalOrder(order) && String(order?.globalApproval || 'pending').toLowerCase() === 'pending' && !order?.fulfillment && !order?.shipment;
      if (globalPending) {
        setFulfillment(null);
        setShipment(null);
        setTrackingEvents([]);
        setLoading({ fulfillment: false, shipment: false, tracking: false });
        setErrors({});
        return;
      }
      if (order?.status === 'CREATED' && !order?.fulfillment && !order?.shipment && !order?.trackingEvents?.length) {
        setFulfillment(null);
        setShipment(null);
        setTrackingEvents([]);
        setLoading({ fulfillment: false, shipment: false, tracking: false });
        setErrors({});
        return;
      }
      if (order?.fulfillment || order?.shipment || order?.trackingEvents?.length) {
        setFulfillment(order.fulfillment ? normalizeFulfillment(order.fulfillment) : null);
        setShipment(order.shipment ? normalizeShipment(order.shipment) : null);
        setTrackingEvents((order.trackingEvents || []).map(normalizeTrackingEvent).sort((a, b) => new Date(a.eventTime || 0) - new Date(b.eventTime || 0)));
        setLoading({});
        return;
      }
      setLoading({ fulfillment: true, shipment: true, tracking: true });
      const results = await Promise.allSettled([getFulfillmentByOrderId(orderId), getShipmentByOrderId(orderId)]);
      if (ignore) return;
      const nextErrors = {};
      if (results[0].status === 'fulfilled') setFulfillment(normalizeFulfillment(results[0].value));
      else nextErrors.fulfillment = message(results[0].reason);
      const nextShipment = results[1].status === 'fulfilled' ? normalizeShipment(results[1].value) : null;
      setShipment(nextShipment);
      if (results[1].status === 'rejected') nextErrors.shipment = message(results[1].reason);
      setErrors(nextErrors);
      setLoading({ fulfillment: false, shipment: false, tracking: Boolean(nextShipment?.id || nextShipment?.shipmentId) });
      const shipmentId = nextShipment?.id || nextShipment?.shipmentId;
      if (!shipmentId) return;
      try {
        const payload = await getTrackingEvents(shipmentId);
        if (ignore) return;
        const rows = Array.isArray(payload) ? payload : payload?.events || payload?.content || [];
        setTrackingEvents(rows.map(normalizeTrackingEvent).sort((a, b) => new Date(a.eventTime || 0) - new Date(b.eventTime || 0)));
      } catch (error) {
        if (!ignore) setErrors((current) => ({ ...current, tracking: message(error) }));
      } finally {
        if (!ignore) setLoading((current) => ({ ...current, tracking: false }));
      }
    });
    return () => { ignore = true; };
  }, [order, orderId, refreshKey]);

  return { fulfillment, shipment, trackingEvents, loading, errors, refresh };
};
