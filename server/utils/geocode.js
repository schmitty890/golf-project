// Street address -> { lat, lng } via the free US Census geocoder (no API key). Used only by the
// admin delivery map. Only the street line plus the town suffix is sent — never names, phones or
// emails. Returns null when there's no match or the service is unreachable.

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

export default geocodeStreet;
