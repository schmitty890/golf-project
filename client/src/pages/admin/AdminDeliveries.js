/* eslint-disable no-underscore-dangle */
import {
  useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import L from 'leaflet';
import {
  MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from '../../context/AuthContext';
import { paymentMethodLabel, paymentStatusClasses, statusLabel } from '../../utils/orderDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
// The Vineyards on Lake Wylie — where the map opens before any pins exist.
const HOME_CENTER = [35.105, -81.06];
const MAX_PHOTOS = 6;

const btn = 'rounded-md border border-cream-300 bg-white px-2.5 py-1 text-xs font-semibold text-walnut transition-colors hover:border-ember';

// ISO timestamp or 'YYYY-MM-DD' -> "Sat, Nov 15, 2026" (date-only strings stay in local time).
function formatDay(value) {
  if (!value) return 'No date';
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = parts ? new Date(+parts[1], +parts[2] - 1, +parts[3]) : new Date(value);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

const monthKey = (value) => {
  if (!value) return '';
  const parts = /^(\d{4})-(\d{2})/.exec(value);
  if (parts && value.length === 10) return `${parts[1]}-${parts[2]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
const sortTime = (d) => {
  const t = new Date(d.date || d.createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const addressLine = (d) => [d.street, d.unit].filter(Boolean).join(', ');

// Round pin with the number of deliveries at that address. Upcoming-only addresses are outlined.
function pinIcon(count, upcomingOnly) {
  const fill = upcomingOnly ? 'background:#fff;color:#C9551C;border:3px solid #C9551C' : 'background:#C9551C;color:#fff;border:3px solid #fff';
  return L.divIcon({
    className: '',
    html: `<div style="${fill};width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:700 13px system-ui;box-shadow:0 2px 6px rgba(0,0,0,.35)">${count}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

// Resize to ≤1600px and re-encode as JPEG. Drawing to a canvas also drops EXIF (incl. GPS) and
// bakes in the phone's rotation, so the stored photo is small, upright and metadata-free.
function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser can't read that photo — try a JPEG or take it with the camera."));
    };
    img.src = url;
  });
}

// Photos are admin-only, so a plain <img src> (no auth header) can't load them: fetch as a blob.
const blobCache = new Map();
function AuthImage({
  photoId, token, className = '', alt = 'Delivery photo',
}) {
  const [src, setSrc] = useState(blobCache.get(photoId) || '');
  useEffect(() => {
    if (blobCache.has(photoId)) { setSrc(blobCache.get(photoId)); return undefined; }
    let live = true;
    axios.get(`${API_URL}/api/deliveries/photos/${photoId}`, {
      headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
    }).then((res) => {
      const url = URL.createObjectURL(res.data);
      blobCache.set(photoId, url);
      if (live) setSrc(url);
    }).catch(() => {});
    return () => { live = false; };
  }, [photoId, token]);
  if (!src) return <div className={`${className} animate-pulse bg-cream-300`} />;
  return <img src={src} alt={alt} className={className} />;
}

AuthImage.propTypes = {
  photoId: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  className: PropTypes.string,
  alt: PropTypes.string,
};
AuthImage.defaultProps = { className: '', alt: 'Delivery photo' };

// Fit the map to the pins whenever the set of pins changes.
function FitToPins({ points }) {
  const map = useMap();
  const sig = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 16);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, map]);
  return null;
}

function PickLocation({ active, onPick }) {
  useMapEvents({ click: (e) => { if (active) onPick(e.latlng); } });
  return null;
}

function PhotoStrip({
  d, token, onOpen, size = 'h-14 w-14',
}) {
  if (!d.photoIds.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {d.photoIds.map((id) => (
        <button key={id} type="button" onClick={() => onOpen(id, d)} className="overflow-hidden rounded-md ring-1 ring-cream-300 hover:ring-ember">
          <AuthImage photoId={id} token={token} className={`${size} object-cover`} />
        </button>
      ))}
    </div>
  );
}

const deliveryShape = PropTypes.shape({
  _id: PropTypes.string,
  photoIds: PropTypes.arrayOf(PropTypes.string),
});
PhotoStrip.propTypes = {
  d: deliveryShape.isRequired,
  token: PropTypes.string.isRequired,
  onOpen: PropTypes.func.isRequired,
  size: PropTypes.string,
};
PhotoStrip.defaultProps = { size: 'h-14 w-14' };

function Summary({ d }) {
  const paid = d.paymentStatus === 'paid';
  const method = paymentMethodLabel(d.paymentMethod);
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-walnut-400">
      {d.bundles > 0 && <span>{`${d.bundles} bundle${d.bundles === 1 ? '' : 's'}`}</span>}
      {d.total != null && <span>{`· $${d.total}`}</span>}
      <span className={`rounded-full px-2 py-0.5 font-semibold ${paymentStatusClasses[paid ? 'paid' : 'unpaid']}`}>
        {`${method ? `${method} · ` : ''}${paid ? 'Paid' : 'Unpaid'}`}
      </span>
      {!d.delivered && (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-800">{statusLabel(d.status)}</span>
      )}
    </div>
  );
}
Summary.propTypes = {
  d: PropTypes.shape({
    bundles: PropTypes.number,
    total: PropTypes.number,
    paymentStatus: PropTypes.string,
    paymentMethod: PropTypes.string,
    delivered: PropTypes.bool,
    status: PropTypes.string,
  }).isRequired,
};

function AdminDeliveries() {
  const { token } = useContext(AuthContext);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [month, setMonth] = useState('all');
  const [fixing, setFixing] = useState(null); // delivery whose pin is being placed
  const [busyId, setBusyId] = useState('');
  const [viewer, setViewer] = useState(null); // { photoId, d }
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const fileRef = useRef(null);
  const uploadFor = useRef(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(() => {
    if (!token) return;
    setError('');
    axios.get(`${API_URL}/api/deliveries`, {
      headers, params: showUpcoming ? { include: 'upcoming' } : {},
    })
      .then((res) => setDeliveries(res.data.deliveries || []))
      .catch(() => setError('Could not load deliveries.'))
      .finally(() => setLoading(false));
  }, [token, headers, showUpcoming]);

  useEffect(() => { load(); }, [load]);

  const months = useMemo(() => {
    const keys = new Set(deliveries.map((d) => monthKey(d.date || d.createdAt)).filter(Boolean));
    return [...keys].sort().reverse();
  }, [deliveries]);

  const visible = useMemo(() => deliveries
    .filter((d) => month === 'all' || monthKey(d.date || d.createdAt) === month)
    .sort((a, b) => sortTime(b) - sortTime(a)), [deliveries, month]);

  // One pin per address (repeat customers share a pin), newest delivery first inside it.
  const pins = useMemo(() => {
    const byAddr = new Map();
    visible.filter((d) => d.geo).forEach((d) => {
      const key = d.addressKey || d._id;
      if (!byAddr.has(key)) byAddr.set(key, { key, geo: d.geo, list: [] });
      byAddr.get(key).list.push(d);
    });
    return [...byAddr.values()];
  }, [visible]);

  const done = visible.filter((d) => d.delivered);
  const stats = [
    { label: 'Deliveries', value: done.length },
    { label: 'Homes', value: new Set(done.map((d) => d.addressKey)).size },
    { label: 'Bundles', value: done.reduce((s, d) => s + (d.bundles || 0), 0) },
    { label: 'Revenue', value: `$${done.reduce((s, d) => s + (d.total || 0), 0)}` },
  ];

  const showOnMap = (d) => {
    const map = mapRef.current;
    if (!map || !d.geo) return;
    map.flyTo([d.geo.lat, d.geo.lng], 17, { duration: 0.6 });
    setTimeout(() => markerRefs.current[d.addressKey || d._id]?.openPopup(), 650);
    document.getElementById('delivery-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const startFix = (d) => {
    setFixing(d);
    mapRef.current?.closePopup();
    document.getElementById('delivery-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const savePin = async ({ lat, lng }) => {
    if (!fixing) return;
    try {
      const res = await axios.patch(`${API_URL}/api/deliveries/${fixing._id}/location`, { lat, lng }, { headers });
      const key = fixing.addressKey;
      setDeliveries((prev) => prev.map((d) => (
        d._id === fixing._id || (key && d.addressKey === key) ? { ...d, geo: res.data.geo } : d
      )));
      setFixing(null);
    } catch {
      setError('Could not save that pin.');
    }
  };

  const pickPhoto = (d) => {
    uploadFor.current = d;
    fileRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    const d = uploadFor.current;
    e.target.value = '';
    if (!file || !d) return;
    setBusyId(d._id);
    setError('');
    try {
      const dataUrl = await resizePhoto(file);
      const res = await axios.post(`${API_URL}/api/deliveries/${d._id}/photos`, { dataUrl }, { headers });
      setDeliveries((prev) => prev.map((x) => (
        x._id === d._id ? { ...x, photoIds: [...x.photoIds, res.data.photoId] } : x
      )));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed.');
    } finally {
      setBusyId('');
    }
  };

  const deletePhoto = async () => {
    if (!viewer) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this photo?')) return;
    try {
      await axios.delete(`${API_URL}/api/deliveries/photos/${viewer.photoId}`, { headers });
      setDeliveries((prev) => prev.map((x) => (
        x._id === viewer.d._id
          ? { ...x, photoIds: x.photoIds.filter((p) => p !== viewer.photoId) }
          : x
      )));
      setViewer(null);
    } catch {
      setError('Could not delete that photo.');
    }
  };

  const openPhoto = (photoId, d) => setViewer({ photoId, d });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-walnut">Delivery map</h1>
          <p className="mt-1 text-sm text-walnut-400">Every home you&apos;ve delivered to — who, when and what. Only you can see this.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Filter by month"
            className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-walnut"
          >
            <option value="all">All time</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <label htmlFor="show-upcoming" className="flex cursor-pointer items-center gap-2 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm font-semibold text-walnut">
            <input id="show-upcoming" type="checkbox" checked={showUpcoming} onChange={(e) => setShowUpcoming(e.target.checked)} className="accent-ember" />
            Show upcoming
          </label>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-cream-300 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-walnut-400">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-walnut">{s.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {fixing && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ember px-4 py-3 text-sm font-semibold text-white">
          <span>{`Tap the map where ${fixing.name || 'this home'} (${addressLine(fixing)}) is.`}</span>
          <button type="button" onClick={() => setFixing(null)} className="rounded-md bg-white/20 px-3 py-1 hover:bg-white/30">Cancel</button>
        </div>
      )}

      <div id="delivery-map" className={`relative z-0 mt-4 overflow-hidden rounded-2xl border border-cream-300 ${fixing ? 'ring-4 ring-ember/40' : ''}`}>
        <MapContainer
          ref={mapRef}
          center={HOME_CENTER}
          zoom={15}
          scrollWheelZoom={false}
          className={`h-[380px] w-full sm:h-[500px] ${fixing ? 'cursor-crosshair' : ''}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToPins points={pins.map((p) => [p.geo.lat, p.geo.lng])} />
          <PickLocation active={!!fixing} onPick={savePin} />
          {pins.map((p) => (
            <Marker
              key={p.key}
              position={[p.geo.lat, p.geo.lng]}
              icon={pinIcon(p.list.length, p.list.every((d) => !d.delivered))}
              ref={(m) => { markerRefs.current[p.key] = m; }}
            >
              <Popup minWidth={240} maxWidth={300}>
                <p className="!m-0 text-sm font-bold text-walnut">{addressLine(p.list[0])}</p>
                {p.list[0].neighborhood && <p className="!m-0 text-xs text-walnut-400">{p.list[0].neighborhood}</p>}
                <ul className="mt-2 max-h-72 space-y-3 overflow-y-auto">
                  {p.list.map((d) => (
                    <li key={d._id} className="border-t border-cream-300 pt-2">
                      <p className="!m-0 text-sm font-semibold text-walnut">{d.name}</p>
                      <p className="!m-0 text-xs text-walnut-400">{`${d.delivered ? 'Delivered' : 'Scheduled'} ${formatDay(d.date)}`}</p>
                      <Summary d={d} />
                      <PhotoStrip d={d} token={token} onOpen={openPhoto} size="h-16 w-16" />
                    </li>
                  ))}
                </ul>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {!loading && !pins.length && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] text-center">
            <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-walnut shadow">
              {visible.length ? 'No pins yet — use “Fix pin” below' : 'No deliveries yet'}
            </span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-walnut-400">
        {`${visible.length} ${showUpcoming ? 'orders' : 'deliveries'}`}
      </h2>
      {loading && <p className="mt-3 text-sm text-walnut-400">Loading…</p>}
      <ul className="mt-3 space-y-3">
        {visible.map((d) => (
          <li key={d._id} className="rounded-xl border border-cream-300 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ember">
                  {`${d.delivered ? 'Delivered' : 'Scheduled'} · ${formatDay(d.date)}`}
                </p>
                <p className="mt-0.5 font-bold text-walnut">{d.name}</p>
                <p className="text-sm text-walnut-400">
                  {[addressLine(d), d.neighborhood].filter(Boolean).join(' · ') || 'No address'}
                </p>
                <div className="mt-1"><Summary d={d} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {d.geo ? (
                  <button type="button" className={btn} onClick={() => showOnMap(d)}>Show on map</button>
                ) : (
                  <span className="self-center text-xs text-amber-700">No pin yet</span>
                )}
                <button type="button" className={btn} onClick={() => startFix(d)}>{d.geo ? 'Move pin' : 'Fix pin'}</button>
                {d.photoIds.length < MAX_PHOTOS && (
                  <button type="button" className={btn} disabled={busyId === d._id} onClick={() => pickPhoto(d)}>
                    {busyId === d._id ? 'Uploading…' : 'Add photo'}
                  </button>
                )}
              </div>
            </div>
            <PhotoStrip d={d} token={token} onOpen={openPhoto} />
          </li>
        ))}
      </ul>

      {viewer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={() => setViewer(null)} />
          <div className="relative max-h-full w-full max-w-2xl">
            <AuthImage photoId={viewer.photoId} token={token} className="max-h-[80vh] w-full rounded-xl object-contain" />
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white">
              <span>{`${viewer.d.name} · ${formatDay(viewer.d.date)}`}</span>
              <span className="flex gap-2">
                <button type="button" onClick={deletePhoto} className="rounded-md bg-white/15 px-3 py-1.5 font-semibold hover:bg-red-600">Delete</button>
                <button type="button" onClick={() => setViewer(null)} className="rounded-md bg-white px-3 py-1.5 font-semibold text-walnut">Close</button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

FitToPins.propTypes = { points: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired };
PickLocation.propTypes = { active: PropTypes.bool.isRequired, onPick: PropTypes.func.isRequired };

export default AdminDeliveries;
