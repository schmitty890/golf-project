/* eslint-disable no-underscore-dangle */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';
import { TIME_WINDOWS } from '../../data/pricing';
import { todayStr, relativeDayLabel } from '../../utils/dates';
import {
  describeOrder, formatSchedule,
  effectiveDate, effectiveStart, isConfirmedWindow,
} from '../../utils/orderDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Map an 'HH:MM' start to its window label (e.g. '5–6 PM') for the confirm chips.
const windowLabel = (from, to) => {
  const w = TIME_WINDOWS.find((x) => x.from === from && x.to === to);
  return w ? w.label : `${from}–${to}`;
};

// Sort deliveries into a sensible loop: by section, then street, then time window.
const byRoute = (a, b) => {
  const na = a.deliveryAddress?.neighborhood || '';
  const nb = b.deliveryAddress?.neighborhood || '';
  if (na !== nb) return na.localeCompare(nb);
  const sa = a.deliveryAddress?.street || '';
  const sb = b.deliveryAddress?.street || '';
  if (sa !== sb) return sa.localeCompare(sb);
  return effectiveStart(a).localeCompare(effectiveStart(b));
};

const addressText = (o) => {
  const a = o.deliveryAddress || {};
  return [a.street, a.unit, a.neighborhood].filter(Boolean).join(', ');
};

function AdminSchedule() {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const patch = async (id, body) => {
    try {
      const res = await axios.patch(`${API_URL}/api/orders/${id}`, body, authHeaders);
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, ...res.data } : o)));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update order');
    }
  };

  const confirmWindow = (order, w) => patch(order._id, {
    schedule: { date: order.preferredDate, from: w.from, to: w.to },
    status: 'confirmed',
  });

  const markDelivered = (id) => patch(id, { status: 'delivered' });

  // Copy a day's delivery stops (in route order) to the clipboard for phone nav / notes.
  const copyStops = (date, deliveries) => {
    const lines = deliveries.map((o, i) => {
      const win = isConfirmedWindow(o)
        ? formatSchedule({ from: o.schedule.from, to: o.schedule.to })
        : 'window TBD';
      return `${i + 1}. ${o.contact?.name || 'Customer'} — ${addressText(o) || 'no address'} (${win})`;
    });
    const text = `${relativeDayLabel(date)} — deliveries:\n${lines.join('\n')}`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(date);
      setTimeout(() => setCopied((c) => (c === date ? '' : c)), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  // Upcoming, active orders grouped by the date they happen, sorted by time.
  const today = todayStr();
  const active = orders
    .filter((o) => !['cancelled', 'delivered'].includes(o.status))
    .filter((o) => effectiveDate(o) && effectiveDate(o) >= today)
    .sort((a, b) => {
      const d = effectiveDate(a).localeCompare(effectiveDate(b));
      return d !== 0 ? d : effectiveStart(a).localeCompare(effectiveStart(b));
    });

  const groups = [];
  active.forEach((o) => {
    const date = effectiveDate(o);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(o);
    else groups.push({ date, items: [o] });
  });

  const renderCard = (order) => {
    const isPickup = order.fulfillment === 'pickup';
    const confirmed = isConfirmedWindow(order);
    return (
      <li key={order._id} className="rounded-lg border border-cream-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {confirmed ? (
              <p className="text-lg font-extrabold text-walnut">
                {formatSchedule({ from: order.schedule.from, to: order.schedule.to })}
              </p>
            ) : (
              <p className="text-sm font-semibold text-amber-700">Pick a window to confirm</p>
            )}

            <p className="mt-1 text-sm text-walnut">
              <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${isPickup ? 'bg-cream-300 text-walnut' : 'bg-blue-100 text-blue-800'}`}>
                {isPickup ? 'Curb pickup' : 'Deliver'}
              </span>
              {describeOrder(order)}
              {order.rush && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">RUSH</span>
              )}
            </p>

            {!isPickup && order.deliveryAddress?.street && (
              <p className="mt-1 flex items-center gap-1 text-sm text-walnut-400">
                <MapPinIcon className="h-4 w-4 shrink-0" />
                {order.deliveryAddress.street}
                {order.deliveryAddress.unit ? `, ${order.deliveryAddress.unit}` : ''}
                {order.deliveryAddress.neighborhood ? ` · ${order.deliveryAddress.neighborhood}` : ''}
              </p>
            )}

            <p className="mt-1 flex items-center gap-1 text-sm text-walnut-400">
              <span className="font-semibold text-walnut">{order.contact?.name}</span>
              {order.contact?.phone && (
                <a href={`tel:${order.contact.phone}`} className="ml-1 flex items-center gap-1 text-ember hover:underline">
                  <PhoneIcon className="h-4 w-4" />
                  {order.contact.phone}
                </a>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => markDelivered(order._id)}
            className="shrink-0 rounded-lg border border-cream-300 px-3 py-1.5 text-sm font-semibold text-walnut hover:border-ember"
          >
            Mark done
          </button>
        </div>

        {!confirmed && (order.preferredTimes || []).length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-walnut-300">Confirm:</span>
            {order.preferredTimes.map((w) => (
              <button
                type="button"
                key={w.from}
                onClick={() => confirmWindow(order, w)}
                className="rounded-lg border border-ember bg-white px-3 py-1.5 text-sm font-semibold text-ember hover:bg-ember hover:text-white"
              >
                {windowLabel(w.from, w.to)}
              </button>
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-walnut">Schedule</h1>
      <p className="mt-1 text-sm text-walnut-400">
        Your delivery day, by date — deliveries grouped in route order, pickups separate.
        Confirm a window with one tap; mark done once it&apos;s picked up or delivered.
      </p>

      {loading && <p className="mt-8 text-walnut-400">Loading…</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {!loading && groups.length === 0 && (
        <p className="mt-12 text-center text-walnut-400">Nothing scheduled — you&apos;re all caught up.</p>
      )}

      {groups.map((group) => {
        const deliveries = group.items.filter((o) => o.fulfillment !== 'pickup').sort(byRoute);
        const pickups = group.items.filter((o) => o.fulfillment === 'pickup');
        const streets = new Set(deliveries.map((o) => o.deliveryAddress?.street || '').filter(Boolean)).size;
        const summary = [
          deliveries.length ? `${deliveries.length} deliver${deliveries.length === 1 ? 'y' : 'ies'}` : '',
          deliveries.length && streets ? `${streets} street${streets === 1 ? '' : 's'}` : '',
          pickups.length ? `${pickups.length} pickup${pickups.length === 1 ? '' : 's'}` : '',
        ].filter(Boolean).join(' · ');

        return (
          <section key={group.date} className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ember">
                {relativeDayLabel(group.date)}
              </h2>
              {deliveries.length > 0 && (
                <button
                  type="button"
                  onClick={() => copyStops(group.date, deliveries)}
                  className="rounded-lg border border-cream-300 px-3 py-1 text-xs font-semibold text-walnut hover:border-ember"
                >
                  {copied === group.date ? 'Copied!' : 'Copy stops'}
                </button>
              )}
            </div>
            {summary && <p className="mt-1 text-xs text-walnut-400">{summary}</p>}

            {deliveries.length > 0 && (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-walnut-300">Deliveries (route order)</p>
                <ul className="mt-2 space-y-3">{deliveries.map(renderCard)}</ul>
              </>
            )}

            {pickups.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-walnut-300">Pickups</p>
                <ul className="mt-2 space-y-3">{pickups.map(renderCard)}</ul>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default AdminSchedule;
