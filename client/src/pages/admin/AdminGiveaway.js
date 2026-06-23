/* eslint-disable jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const inputClass = 'rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-walnut focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';
const cardClass = 'mt-6 rounded-xl border border-cream-300 bg-white p-5';

function AdminGiveaway() {
  const { token } = useContext(AuthContext);
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [prizeBundles, setPrizeBundles] = useState(1);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [justWon, setJustWon] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/giveaway`, authHeaders);
      setData(res.data);
      setEnabled(res.data.enabled);
      setPrizeBundles(res.data.prizeBundles || 1);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load giveaway');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async (next) => {
    try {
      await axios.put(`${API_URL}/api/settings/availability`, { giveaway: next }, authHeaders);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    }
  };

  const toggleEnabled = (value) => {
    setEnabled(value);
    saveSettings({ enabled: value, prizeBundles });
  };

  const changePrize = (value) => {
    const n = Math.min(3, Math.max(1, Number(value) || 1));
    setPrizeBundles(n);
    saveSettings({ enabled, prizeBundles: n });
  };

  const draw = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Draw this month’s winner now? This can only be done once.')) return;
    setDrawing(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/giveaway/draw`, {}, authHeaders);
      setJustWon(res.data);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to draw a winner');
    } finally {
      setDrawing(false);
    }
  };

  if (!data) return <p className="mt-8 text-walnut-400">Loading…</p>;

  const members = data.members || [];
  const eligibleCount = members.filter((m) => m.eligible).length;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-walnut">Giveaway</h1>
      <p className="mt-1 text-sm text-walnut-400">
        A monthly drawing for free firewood. Neighbors join once and stay entered; draw one winner a
        month. Winners get a single-use free-bundle code by email.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {/* Settings */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-walnut">Settings</h2>
          {saved && <span className="text-sm font-semibold text-green-700">Saved ✓</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-6">
          <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-walnut">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => toggleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
            />
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
              {enabled ? 'Active this month' : 'Off'}
            </span>
          </label>
          <div>
            <label htmlFor="prize" className="block text-xs font-semibold text-walnut">Prize size</label>
            <select id="prize" value={prizeBundles} onChange={(e) => changePrize(e.target.value)} className={`mt-1 ${inputClass}`}>
              <option value={1}>1 free bundle</option>
              <option value={2}>2 free bundles</option>
              <option value={3}>3 free bundles</option>
            </select>
          </div>
        </div>
      </div>

      {/* Draw */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-walnut">{`This month (${data.month})`}</h2>
            <p className="mt-1 text-xs text-walnut-400">
              {`${eligibleCount} eligible entrant${eligibleCount === 1 ? '' : 's'} (of ${members.length} on the list)`}
            </p>
          </div>
          {data.drawn ? (
            <span className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
              {`Winner: ${data.winner?.name} (${data.winner?.code})`}
            </span>
          ) : (
            <button
              type="button"
              onClick={draw}
              disabled={drawing || eligibleCount === 0}
              className="rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              {drawing ? 'Drawing…' : 'Draw winner'}
            </button>
          )}
        </div>
        {justWon && (
          <p className="mt-3 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900">
            {`🎉 ${justWon.name} won ${justWon.bundles} free bundle${justWon.bundles === 1 ? '' : 's'}! Code ${justWon.code} emailed to ${justWon.email || 'them'}.`}
          </p>
        )}
      </div>

      {/* Members */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-walnut">{`On the list (${members.length})`}</h2>
        {members.length === 0 ? (
          <p className="mt-3 text-sm text-walnut-400">No one has joined yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cream-300">
            {members.map((m) => (
              <li key={m.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-walnut">
                  {m.name}
                  {!m.eligible && <span className="ml-2 text-xs text-amber-600">(no address — not eligible)</span>}
                </span>
                <span className="text-xs text-walnut-300">{m.neighborhood || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Past winners */}
      {data.pastWinners?.length > 0 && (
        <div className={cardClass}>
          <h2 className="text-base font-bold text-walnut">Past winners</h2>
          <ul className="mt-3 divide-y divide-cream-300">
            {data.pastWinners.map((w) => (
              <li key={w.month} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-walnut">{`${w.month} — ${w.name}`}</span>
                <span className="text-xs text-walnut-300">{`${w.bundles}× · ${w.code}`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AdminGiveaway;
