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
const cardBase = 'rounded-xl border border-cream-300 bg-white p-5';
const cardClass = `mt-6 ${cardBase}`;
const btnPrimary = 'rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ember-600';
const btnSecondary = 'rounded-lg border border-cream-300 px-4 py-2 text-sm font-semibold text-walnut transition-colors hover:border-ember';

const REASON_LABELS = {
  admin_adjust: 'Adjusted',
  admin_set: 'Set total',
  order_paid: 'Order paid',
  order_unpaid: 'Order un-paid',
  subscription_renewal: 'Subscription renewal',
};

// --- Shared presentational helpers (one consistent look across the page) ---

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-bold uppercase tracking-wide text-walnut-400">{title}</h2>
      {children}
    </section>
  );
}

function Card({ title, saved, children }) {
  return (
    <div className={cardBase}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-walnut">{title}</h3>
        {saved && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-semibold text-green-700">Saved ✓</span>}
      </div>
      {children}
    </div>
  );
}

// The "easy update" row shared by both stock items: quick +5/+10/+25, a custom add, and a set-to.
function RestockControls({ onAdd, onSet }) {
  const [addVal, setAddVal] = useState('');
  const [setVal, setSetVal] = useState('');
  const doAdd = () => { const n = Math.round(Number(addVal) || 0); if (n) { onAdd(n); setAddVal(''); } };
  const doSet = () => { if (setVal !== '') { onSet(Math.max(0, Math.round(Number(setVal) || 0))); setSetVal(''); } };
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-walnut-400">Quick restock</span>
        {[5, 10, 25].map((n) => (
          <button key={n} type="button" onClick={() => onAdd(n)} className="rounded-lg border border-cream-300 px-3 py-1.5 text-sm font-semibold text-walnut transition-colors hover:border-ember">
            {`+${n}`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-semibold text-walnut">Add</label>
          <input type="number" value={addVal} onChange={(e) => setAddVal(e.target.value)} placeholder="0" className={`mt-1 w-20 ${inputClass}`} />
        </div>
        <button type="button" onClick={doAdd} className={btnPrimary}>Add</button>
        <span className="px-1 pb-2 text-xs text-walnut-300">or</span>
        <div>
          <label className="block text-xs font-semibold text-walnut">Set to</label>
          <input type="number" value={setVal} onChange={(e) => setSetVal(e.target.value)} placeholder="0" className={`mt-1 w-20 ${inputClass}`} />
        </div>
        <button type="button" onClick={doSet} className={btnSecondary}>Set</button>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className={`${cardBase} text-center`}>
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
      <h3 className="text-base font-bold text-walnut">{title}</h3>
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

Section.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
Card.propTypes = {
  title: PropTypes.string.isRequired,
  saved: PropTypes.bool,
  children: PropTypes.node.isRequired,
};
Card.defaultProps = { saved: false };
RestockControls.propTypes = { onAdd: PropTypes.func.isRequired, onSet: PropTypes.func.isRequired };
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

  const [bundlesSaved, setBundlesSaved] = useState(false);
  const [banner, setBanner] = useState({ publicBannerEnabled: false, lowStockThreshold: 15 });
  const [bannerSaved, setBannerSaved] = useState(false);
  const [woodType, setWoodType] = useState({ label: '', note: '' });
  const [woodSaved, setWoodSaved] = useState(false);
  const [kindling, setKindling] = useState({ enabled: false, price: 8, quantity: 0 });
  const [kindlingSaved, setKindlingSaved] = useState(false);

  const flash = (setter) => { setter(true); setTimeout(() => setter(false), 3500); };

  const load = useCallback(async () => {
    try {
      const [inv, an, settings] = await Promise.all([
        axios.get(`${API_URL}/api/inventory`, authHeaders),
        axios.get(`${API_URL}/api/analytics/orders`, authHeaders),
        axios.get(`${API_URL}/api/settings/availability`),
      ]);
      setInventory(inv.data.inventory);
      setLog(inv.data.log || []);
      setBanner({
        publicBannerEnabled: inv.data.inventory.publicBannerEnabled,
        lowStockThreshold: inv.data.inventory.lowStockThreshold,
      });
      setWoodType(settings.data.woodType || { label: '', note: '' });
      if (settings.data.kindling) setKindling(settings.data.kindling);
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

  const adjustBundles = async (delta) => {
    if (!delta) return;
    try {
      const res = await axios.post(`${API_URL}/api/inventory/adjust`, { delta }, authHeaders);
      refreshAfterAdjust(res.data);
      flash(setBundlesSaved);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to adjust inventory');
    }
  };

  const setBundles = async (value) => {
    try {
      const res = await axios.post(`${API_URL}/api/inventory/adjust`, { setTo: value }, authHeaders);
      refreshAfterAdjust(res.data);
      flash(setBundlesSaved);
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
      flash(setBannerSaved);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save banner settings');
    }
  };

  const saveWoodType = async () => {
    try {
      const res = await axios.put(`${API_URL}/api/settings/availability`, {
        woodType: { label: woodType.label, note: woodType.note },
      }, authHeaders);
      if (res.data.woodType) setWoodType(res.data.woodType);
      flash(setWoodSaved);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save wood type');
    }
  };

  const saveKindling = async (next) => {
    setKindling(next);
    try {
      const res = await axios.put(`${API_URL}/api/settings/availability`, {
        kindling: {
          enabled: next.enabled,
          price: Number(next.price) || 0,
          quantity: Math.max(0, Math.round(Number(next.quantity) || 0)),
        },
      }, authHeaders);
      if (res.data.kindling) setKindling(res.data.kindling);
      flash(setKindlingSaved);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save the Fire Starter Pack');
    }
  };

  if (loading) return <p className="mt-8 text-walnut-400">Loading…</p>;

  const prepared = inventory?.bundlesPrepared ?? 0;
  const low = inventory && prepared <= (inventory.lowStockThreshold ?? 0);
  let preparedColor = 'text-walnut';
  if (prepared < 0) preparedColor = 'text-red-600';
  else if (low) preparedColor = 'text-amber-600';

  const kQty = Number(kindling.quantity) || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-walnut">Inventory</h1>
      <p className="mt-1 text-sm text-walnut-400">
        Track what you have for sale, control what customers see, and watch your order trends. Stock
        counts deduct automatically as paid orders come in.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {/* Stock */}
      <Section title="Stock">
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Card title="Firewood bundles" saved={bundlesSaved}>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold ${preparedColor}`}>{prepared}</span>
              <span className="text-sm text-walnut-400">ready to sell</span>
            </div>
            <RestockControls onAdd={adjustBundles} onSet={setBundles} />
            {prepared < 0 && (
              <p className="mt-3 text-xs text-amber-600">
                Negative means you&apos;ve sold more than you logged — restock to catch up.
              </p>
            )}
          </Card>

          <Card title="Fire Starter Pack" saved={kindlingSaved}>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-walnut">{kQty}</span>
              <span className="text-sm text-walnut-400">packs for sale</span>
            </div>
            <RestockControls
              onAdd={(n) => saveKindling({ ...kindling, quantity: kQty + n })}
              onSet={(v) => saveKindling({ ...kindling, quantity: v })}
            />
            <div className="mt-4 flex flex-wrap items-end gap-6 border-t border-cream-300 pt-4">
              <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-walnut">
                <input
                  type="checkbox"
                  checked={kindling.enabled}
                  onChange={(e) => saveKindling({ ...kindling, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
                />
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${kindling.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {kindling.enabled ? 'Shown on site' : 'Hidden'}
                </span>
              </label>
              <div>
                <label htmlFor="k-price" className="block text-xs font-semibold text-walnut">Price ($)</label>
                <input
                  id="k-price"
                  type="number"
                  min={0}
                  value={kindling.price}
                  onChange={(e) => setKindling({ ...kindling, price: e.target.value })}
                  onBlur={() => saveKindling(kindling)}
                  className={`mt-1 w-24 ${inputClass}`}
                />
              </div>
            </div>
            {kindling.enabled && kQty <= 0 && (
              <p className="mt-2 text-xs text-amber-600">Sold out — add quantity to show it on the site.</p>
            )}
          </Card>
        </div>
      </Section>

      {/* What customers see */}
      <Section title="What customers see">
        <div className="mt-3 space-y-6">
          <Card title="Current wood type" saved={woodSaved}>
            <p className="mt-1 text-xs text-walnut-400">
              What you&apos;re selling right now. Shows on the site and is saved onto each new order
              (e.g. &ldquo;Oak&rdquo; or &ldquo;Cherry&rdquo;).
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="wt-label" className="block text-xs font-semibold text-walnut">Label</label>
                <input id="wt-label" value={woodType.label} onChange={(e) => setWoodType({ ...woodType, label: e.target.value })} placeholder="Mixed seasoned hardwood" className={`mt-1 w-full ${inputClass}`} />
              </div>
              <div>
                <label htmlFor="wt-note" className="block text-xs font-semibold text-walnut">Note (optional)</label>
                <input id="wt-note" value={woodType.note} onChange={(e) => setWoodType({ ...woodType, note: e.target.value })} placeholder="A rotating assortment — oak, hickory, maple & more" className={`mt-1 w-full ${inputClass}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={saveWoodType} className={btnPrimary}>Save</button>
              {woodSaved && <span className="text-sm font-semibold text-green-700">Saved ✓</span>}
            </div>
          </Card>

          <Card title="Low-stock banner" saved={bannerSaved}>
            <p className="mt-1 text-xs text-walnut-400">
              When on, customers see &ldquo;Only N bundles left this week&rdquo; once stock hits the
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
              <button type="button" onClick={saveBanner} className={btnPrimary}>Save</button>
              {bannerSaved && <span className="pb-2 text-sm font-semibold text-green-700">Saved ✓</span>}
            </div>
          </Card>
        </div>
      </Section>

      {/* Insights */}
      {analytics && (
        <Section title="Insights">
          <div className="mt-3 grid grid-cols-2 gap-4">
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
        </Section>
      )}

      {/* Recent activity */}
      <Section title="Recent activity">
        <div className="mt-3">
          <Card title="Stock changes">
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
          </Card>
        </div>
      </Section>
    </div>
  );
}

export default AdminInventory;
