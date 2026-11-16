/* eslint-disable no-underscore-dangle */
// Street address -> { lat, lng } via the free US Census geocoder (no API key). Used only by the
// admin delivery map. Only the street line plus the town suffix is sent — never names, phones or
// emails. Returns null when there's no match or the service is unreachable.

import Order from '../models/Order.js';
import { streetKey } from './dedupe.js';

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

// Every delivery is in The Vineyards on Lake Wylie, so orders only store the street line.
export const geocodeSuffix = () => process.env.DELIVERY_GEOCODE_SUFFIX || 'Lake Wylie, SC 29710';

export async function geocodeStreet(
  street,
  { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {},
) {
  const line = String(street || '').trim();
  if (!line || typeof fetchImpl !== 'function') return null;
  const params = new URLSearchParams({
    address: `${line}, ${geocodeSuffix()}`,
    benchmark: 'Public_AR_Current',
    format: 'json',
  });
  try {
    const res = await fetchImpl(`${CENSUS_URL}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    const lat = Number(match?.coordinates?.y);
    const lng = Number(match?.coordinates?.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    return null;
  }
}

const hasPin = (geo) => Number.isFinite(geo?.lat) && Number.isFinite(geo?.lng);

// Make sure an order has a map pin (or a recorded miss). Reuses a pin already saved for the same
// street — from `cache` or another order — before asking the geocoder, so each address is looked
// up once. Saves with updateOne so older orders missing newer required fields still get a pin.
// Returns the order's geo. `cache` is an optional Map(streetKey -> geo) shared across a batch.
export async function ensureOrderGeo(order, { cache = null, fetchImpl } = {}) {
  if (!order || order.geo?.source) return order?.geo || null;
  const street = order.deliveryAddress?.street;
  const key = order.streetKey || streetKey(street);
  if (!key) return null;

  let geo = cache?.get(key) || null;
  if (!geo) {
    const twin = await Order.findOne({ streetKey: key, 'geo.lat': { $ne: null } }).select('geo').lean();
    if (hasPin(twin?.geo)) geo = twin.geo;
  }
  if (!geo) {
    const hit = await geocodeStreet(street, fetchImpl ? { fetchImpl } : {});
    geo = hit ? { ...hit, source: 'census' } : { lat: null, lng: null, source: 'failed' };
  }
  const next = {
    lat: geo.lat, lng: geo.lng, source: geo.source, at: new Date(),
  };
  await Order.updateOne({ _id: order._id }, { $set: { geo: next } });
  // eslint-disable-next-line no-param-reassign
  order.geo = next;
  if (cache && hasPin(next)) cache.set(key, next);
  return next;
}

export default geocodeStreet;
