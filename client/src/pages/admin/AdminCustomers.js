/* eslint-disable no-underscore-dangle, jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import {
  describeOrder, statusClasses, statusLabel, paymentStatusClasses, paymentLabel,
} from '../../utils/orderDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const selectClass = 'rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-walnut focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

const fmtDate = (d) => (d
  ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : '—');

const SEG_CLASS = {
  active: 'bg-green-100 text-green-800',
  lapsed: 'bg-amber-100 text-amber-800',
  new: 'bg-gray-100 text-gray-600',
};
const SEG_LABEL = { active: 'Active', lapsed: 'Lapsed', new: 'New' };

const SORTERS = {
  bundles: (a, b) => (b.bundles || 0) - (a.bundles || 0),
  spent: (a, b) => (b.paidValue || 0) - (a.paidValue || 0),
  recent: (a, b) => new Date(b.lastPaidOrderAt || 0) - new Date(a.lastPaidOrderAt || 0),
  name: (a, b) => `${a.firstName || a.name || ''} ${a.lastName || ''}`
    .trim().localeCompare(`${b.firstName || b.name || ''} ${b.lastName || ''}`.trim()),
};

function StatPill({ label, value }) {
  return (
    <div className="rounded-lg border border-cream-300 bg-white px-4 py-2 text-center">
      <p className="text-xl font-extrabold text-walnut">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-walnut-400">{label}</p>
    </div>
  );
}

StatPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

function AdminCustomers() {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState({ accounts: [], guests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [windowDays, setWindowDays] = useState(60);
  const [segment, setSegment] = useState('all');
  const [sortBy, setSortBy] = useState('bundles');
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

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const segmentOf = (c) => {
    if (!c.lastPaidOrderAt) return 'new';
    return now - new Date(c.lastPaidOrderAt).getTime() <= windowMs ? 'active' : 'lapsed';
  };

  // Accounts drive the analytics (segments, giveaway, sorting); guests stay a simple search list.
  const searchedAccounts = data.accounts
    .filter((a) => match(`${a.firstName} ${a.lastName}`, a.email));
  const summary = {
    active: searchedAccounts.filter((a) => segmentOf(a) === 'active').length,
    lapsed: searchedAccounts.filter((a) => segmentOf(a) === 'lapsed').length,
    new: searchedAccounts.filter((a) => segmentOf(a) === 'new').length,
    bundles: searchedAccounts.reduce((s, a) => s + (a.bundles || 0), 0),
    revenue: searchedAccounts.reduce((s, a) => s + (a.paidValue || 0), 0),
  };

  let shownAccounts = searchedAccounts;
  if (segment === 'giveaway') shownAccounts = shownAccounts.filter((a) => a.giveawayMember);
  else if (segment !== 'all') shownAccounts = shownAccounts.filter((a) => segmentOf(a) === segment);
  shownAccounts = [...shownAccounts].sort(SORTERS[sortBy] || SORTERS.bundles);

  const guests = [...data.guests.filter((g) => match(g.name, g.email))]
    .sort(SORTERS[sortBy] || SORTERS.bundles);

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
    const seg = segmentOf(stats);
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
              {stats.giveawayMember && <span className="ml-2" title="Giveaway member">⭐</span>}
              {sub}
            </p>
            <p className="truncate text-sm text-walnut-400">
              {email || 'no email on file'}
              {stats.neighborhood ? ` · ${stats.neighborhood}` : ''}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-walnut">
              {`${stats.bundles || 0} bundle${stats.bundles === 1 ? '' : 's'} · $${stats.paidValue || 0} spent`}
            </p>
            <p className="mt-0.5 flex items-center justify-end gap-2 text-walnut-400">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEG_CLASS[seg]}`}>
                {SEG_LABEL[seg]}
              </span>
              <span>
                {stats.paidOrderCount
                  ? `${stats.paidOrderCount} order${stats.paidOrderCount === 1 ? '' : 's'} · last ${fmtDate(stats.lastPaidOrderAt)}`
                  : 'no paid orders'}
              </span>
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
          {/* Summary */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatPill label="Active" value={summary.active} />
            <StatPill label="Lapsed" value={summary.lapsed} />
            <StatPill label="Never ordered" value={summary.new} />
            <StatPill label="Bundles sold" value={summary.bundles} />
            <StatPill label="Revenue" value={`$${summary.revenue}`} />
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-walnut-400">
              Active within
              <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} className={`ml-2 ${selectClass}`}>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className={selectClass}
            >
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="lapsed">Lapsed</option>
              <option value="new">Never ordered</option>
              <option value="giveaway">Giveaway members</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={selectClass}
            >
              <option value="bundles">Sort: most bundles</option>
              <option value="spent">Sort: most spent</option>
              <option value="recent">Sort: most recent order</option>
              <option value="name">Sort: name</option>
            </select>
          </div>

          <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-walnut-400">
            {`Account holders (${shownAccounts.length})`}
          </h2>
          {shownAccounts.length === 0
            ? <p className="mt-3 text-walnut-400">No matching accounts.</p>
            : (
              <ul className="mt-3 space-y-3">
                {shownAccounts.map((a) => renderCard(
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
