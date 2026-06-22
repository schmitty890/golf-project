/* eslint-disable no-underscore-dangle, jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { AuthContext } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const inputClass = 'rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-walnut focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';
const cardClass = 'mt-6 rounded-xl border border-cream-300 bg-white p-5';

const REASON_LABELS = {
  admin_adjust: 'Adjusted',
  admin_set: 'Set total',
  order_paid: 'Order paid',
  order_unpaid: 'Order un-paid',
  subscription_renewal: 'Subscription renewal',
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-cream-300 bg-white p-5 text-center">
      <p className="text-3xl font-extrabold text-walnut">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-walnut-400">{label}</p>
    </div>
  );
}

function ChartCard({
  title, subtitle, data, bars,
}) {
  const hasData = data && data.length > 0;
  return (
    <div className={cardClass}>
      <h2 className="text-base font-bold text-walnut">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-walnut-400">{subtitle}</p>}
      {!hasData ? (
        <p className="mt-6 text-center text-sm text-walnut-400">No paid orders yet.</p>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 4, right: 8, left: -16, bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ddd0" vertical={false} />
              <XAxis dataKey={bars.xKey} tick={{ fontSize: 12, fill: '#8a7a68' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#8a7a68' }} />
              <Tooltip />
              <Legend />
              {bars.series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.fill}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  bars: PropTypes.shape({
    xKey: PropTypes.string,
    series: PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
};

function AdminInventory() {
  const { token } = useContext(AuthContext);
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [inventory, setInventory] = useState(null);
  const [log, setLog] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [addQty, setAddQty] = useState('');
  const [setQty, setSetQty] = useState('');
  const [banner, setBanner] = useState({ publicBannerEnabled: false, lowStockThreshold: 15 });
  const [bannerSaved, setBannerSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const [inv, an] = await Promise.all([
        axios.get(`${API_URL}/api/inventory`, authHeaders),
        axios.get(`${API_URL}/api/analytics/orders`, authHeaders),
      ]);
      setInventory(inv.data.inventory);
      setLog(inv.data.log || []);
      setBanner({
        publicBannerEnabled: inv.data.inventory.publicBannerEnabled,
        lowStockThreshold: inv.data.inventory.lowStockThreshold,
      });
      setAnalytics(an.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
    // authHeaders is derived from token; load is re-created when token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const refreshAfterAdjust = (data) => {
    setInventory(data);
    setBanner({
      publicBannerEnabled: data.publicBannerEnabled,
      lowStockThreshold: data.lowStockThreshold,
    });
    load(); // refresh the activity log too
  };

  const addBundles = async () => {
    const delta = Math.round(Number(addQty) || 0);
    if (!delta) return;
    try {
      const res = await axios.post(`${API_URL}/api/inventory/adjust`, { delta }, authHeaders);
      setAddQty('');
      refreshAfterAdjust(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to adjust inventory');
    }
  };

  const setTotal = async () => {
    if (setQty === '') return;
    try {
      const res = await axios.post(`${API_URL}/api/inventory/adjust`, { setTo: Number(setQty) }, authHeaders);
      setSetQty('');
      refreshAfterAdjust(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set inventory');
    }
  };

  const saveBanner = async () => {
    try {
      const res = await axios.put(`${API_URL}/api/inventory/settings`, {
        publicBannerEnabled: banner.publicBannerEnabled,
        lowStockThreshold: Number(banner.lowStockThreshold) || 0,
      }, authHeaders);
      setInventory(res.data);
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save banner settings');
    }
  };

  if (loading) return <p className="mt-8 text-walnut-400">Loading…</p>;

  const prepared = inventory?.bundlesPrepared ?? 0;
  const low = inventory && prepared <= (inventory.lowStockThreshold ?? 0);
  let preparedColor = 'text-walnut';
  if (prepared < 0) preparedColor = 'text-red-600';
  else if (low) preparedColor = 'text-amber-600';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-walnut">Inventory</h1>
      <p className="mt-1 text-sm text-walnut-400">
        Bump the prepared-bundle count up when you wrap a batch. Paid orders deduct from it
        automatically. The low-stock banner can show customers when stock is running short.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {/* Current stock + adjust */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-walnut">Bundles prepared (ready to sell)</h2>
            <p className="mt-1 text-xs text-walnut-400">
              Negative means you&apos;ve sold more than you logged as prepared — wrap more and add
              them.
            </p>
          </div>
          <span className={`text-4xl font-extrabold ${preparedColor}`}>
            {prepared}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="add-qty" className="block text-xs font-semibold text-walnut">Wrapped a batch — add</label>
            <div className="mt-1 flex gap-2">
              <input id="add-qty" type="number" value={addQty} onChange={(e) => setAddQty(e.target.value)} placeholder="20" className={`w-24 ${inputClass}`} />
              <button type="button" onClick={addBundles} className="rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600">
                Add
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="set-qty" className="block text-xs font-semibold text-walnut">Or set exact count</label>
            <div className="mt-1 flex gap-2">
              <input id="set-qty" type="number" value={setQty} onChange={(e) => setSetQty(e.target.value)} placeholder="100" className={`w-24 ${inputClass}`} />
              <button type="button" onClick={setTotal} className="rounded-lg border border-cream-300 px-4 py-2 text-sm font-semibold text-walnut hover:border-ember">
                Set
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Public banner settings */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-walnut">Customer low-stock banner</h2>
          {bannerSaved && <span className="text-sm font-semibold text-green-700">Saved ✓</span>}
        </div>
        <p className="mt-1 text-xs text-walnut-400">
          When on, customers see &ldquo;Only N bundles left this week&rdquo; once stock drops to the
          threshold or below. Above it, nothing shows.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-walnut">
            <input
              type="checkbox"
              checked={banner.publicBannerEnabled}
              onChange={(e) => setBanner({ ...banner, publicBannerEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
            />
            Show the banner
          </label>
          <div>
            <label htmlFor="threshold" className="block text-xs font-semibold text-walnut">Low-stock threshold</label>
            <input id="threshold" type="number" min={0} value={banner.lowStockThreshold} onChange={(e) => setBanner({ ...banner, lowStockThreshold: e.target.value })} className={`mt-1 w-24 ${inputClass}`} />
          </div>
          <button type="button" onClick={saveBanner} className="rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600">
            Save
          </button>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2">
            <StatCard label="Paid orders (all time)" value={analytics.totals.orders} />
            <StatCard label="Bundles sold (all time)" value={analytics.totals.bundles} />
          </div>

          <ChartCard
            title="Orders over time"
            subtitle={`Last ${analytics.days} days, by day paid`}
            data={analytics.overTime}
            bars={{
              xKey: 'date',
              series: [
                { key: 'orders', name: 'Orders', fill: '#c2531f' },
                { key: 'bundles', name: 'Bundles', fill: '#e0a96d' },
              ],
            }}
          />

          <ChartCard
            title="When people order — by day of week"
            subtitle="All paid orders. Spot the firepit-weekend pattern."
            data={analytics.byDayOfWeek}
            bars={{
              xKey: 'day',
              series: [{ key: 'orders', name: 'Orders', fill: '#c2531f' }],
            }}
          />

          <ChartCard
            title="When people order — by month"
            subtitle="All paid orders. Watch for seasonal / pre-holiday spikes."
            data={analytics.byMonth}
            bars={{
              xKey: 'month',
              series: [{ key: 'bundles', name: 'Bundles', fill: '#e0a96d' }],
            }}
          />
        </>
      )}

      {/* Recent activity */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-walnut">Recent activity</h2>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-walnut-400">No changes yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cream-300">
            {log.map((row) => (
              <li key={row._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-walnut">
                  {REASON_LABELS[row.reason] || row.reason}
                  {row.note ? ` — ${row.note}` : ''}
                </span>
                <span className="flex items-center gap-3">
                  <span className={`font-semibold ${row.delta < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </span>
                  <span className="w-10 text-right text-walnut-400">{row.balanceAfter}</span>
                  <span className="hidden text-xs text-walnut-300 sm:inline">
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminInventory;
