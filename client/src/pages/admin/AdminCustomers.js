/* eslint-disable no-underscore-dangle */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import {
  describeOrder, statusClasses, statusLabel, paymentStatusClasses, paymentLabel,
} from '../../utils/orderDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const fmtDate = (d) => (d
  ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : '—');

const mix = (c) => [
  c.onetime ? `${c.onetime} one-time` : '',
  c.subscription ? `${c.subscription} subscription` : '',
].filter(Boolean).join(' · ');

function AdminCustomers() {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState({ accounts: [], guests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData({ accounts: res.data.accounts || [], guests: res.data.guests || [] });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggle = (key) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const q = query.trim().toLowerCase();
  const match = (name, email) => !q
    || (name || '').toLowerCase().includes(q) || (email || '').toLowerCase().includes(q);

  const accounts = data.accounts.filter((a) => match(`${a.firstName} ${a.lastName}`, a.email));
  const guests = data.guests.filter((g) => match(g.name, g.email));

  const renderOrders = (orders) => (
    orders.length === 0
      ? <p className="px-4 py-3 text-sm text-walnut-400">No orders yet.</p>
      : (
        <ul className="divide-y divide-cream-300">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className="font-semibold text-walnut">{describeOrder(o)}</span>
                <span className="text-walnut-400">{` · ${fmtDate(o.createdAt)}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses[o.status] || 'bg-gray-100 text-gray-700'}`}>
                  {statusLabel(o.status, o.fulfillment)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusClasses[o.paymentStatus] || ''}`}>
                  {paymentLabel(o)}
                </span>
                <span className="font-bold text-ember">{`$${o.total}`}</span>
              </div>
            </li>
          ))}
        </ul>
      )
  );

  const renderCard = (key, title, email, sub, stats) => {
    const open = expanded.has(key);
    return (
      <li key={key} className="overflow-hidden rounded-lg border border-cream-300 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggle(key)}
          className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-cream-100"
        >
          <div className="min-w-0">
            <p className="font-bold text-walnut">
              {title}
              {sub}
            </p>
            <p className="truncate text-sm text-walnut-400">{email || 'no email on file'}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-walnut">
              {`${stats.orderCount} order${stats.orderCount === 1 ? '' : 's'} · $${stats.totalValue}`}
            </p>
            <p className="text-walnut-400">
              {stats.orderCount ? `${mix(stats.counts)} · last ${fmtDate(stats.lastOrderAt)}` : 'no orders yet'}
            </p>
          </div>
        </button>
        {open && <div className="border-t border-cream-300 bg-cream-50">{renderOrders(stats.orders)}</div>}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-walnut">Customers</h1>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email…"
          className="rounded-xl border border-cream-300 bg-white px-4 py-2 text-sm text-walnut placeholder:text-walnut-200 focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
        />
      </div>

      {loading && <p className="mt-8 text-walnut-400">Loading…</p>}
      {error && <p className="mt-8 text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-walnut-400">
            {`Account holders (${accounts.length})`}
          </h2>
          {accounts.length === 0
            ? <p className="mt-3 text-walnut-400">No accounts found.</p>
            : (
              <ul className="mt-3 space-y-3">
                {accounts.map((a) => renderCard(
                  `a:${a.userId}`,
                  `${a.firstName} ${a.lastName}`.trim() || a.email,
                  a.email,
                  a.role === 'admin' ? <span className="ml-2 rounded-full bg-ember/10 px-2 py-0.5 text-xs font-semibold text-ember">admin</span> : null,
                  a,
                ))}
              </ul>
            )}

          <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-walnut-400">
            {`Guest buyers (${guests.length})`}
          </h2>
          <p className="mt-1 text-xs text-walnut-300">Orders placed without an account, grouped by email.</p>
          {guests.length === 0
            ? <p className="mt-3 text-walnut-400">No guest orders.</p>
            : (
              <ul className="mt-3 space-y-3">
                {guests.map((g) => renderCard(
                  `g:${g.email || g.orders[0]?.id}`,
                  g.name || g.email || 'Guest',
                  g.email,
                  null,
                  g,
                ))}
              </ul>
            )}
        </>
      )}
    </div>
  );
}

export default AdminCustomers;
