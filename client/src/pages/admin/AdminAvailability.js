/* eslint-disable jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { TIME_WINDOWS } from '../../data/pricing';
import MonthCalendar from '../../components/MonthCalendar';
import {
  todayStr, formatDayLabel, dateRange,
} from '../../utils/dates';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const ALL_FROMS = TIME_WINDOWS.map((w) => w.from);

function AdminAvailability() {
  const { token } = useContext(AuthContext);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [draft, setDraft] = useState(new Set()); // froms enabled for the date being edited

  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // Scheduling rules (advance notice + rush). Edited locally, saved on demand.
  const [leadDays, setLeadDays] = useState(1);
  const [rushEnabled, setRushEnabled] = useState(true);
  const [rushPercent, setRushPercent] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/settings/availability`);
      setOverrides(res.data.dateOverrides || {});
      if (res.data.leadDays !== undefined) setLeadDays(res.data.leadDays);
      if (res.data.rushEnabled !== undefined) setRushEnabled(res.data.rushEnabled);
      if (res.data.rushPercent !== undefined) setRushPercent(res.data.rushPercent);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Persist the whole map immediately so there's no separate "Save" step to forget.
  const persist = async (next) => {
    setOverrides(next);
    try {
      await axios.put(
        `${API_URL}/api/settings/availability`,
        { dateOverrides: next },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save — please try again');
    }
  };

  // Save the scheduling rules (separate from the calendar's dateOverrides save).
  const saveRules = async () => {
    try {
      await axios.put(
        `${API_URL}/api/settings/availability`,
        { leadDays: Number(leadDays) || 0, rushEnabled, rushPercent: Number(rushPercent) || 0 },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save — please try again');
    }
  };

  const today = todayStr();

  const getDayState = (dateStr) => {
    if (dateStr < today) return { disabled: true, tone: 'open' };
    const ov = overrides[dateStr];
    let tone = 'open';
    if (Array.isArray(ov)) tone = ov.length === 0 ? 'closed' : 'partial';
    return { tone, selected: dateStr === selectedDate };
  };

  const openEditor = (dateStr) => {
    setSelectedDate(dateStr);
    const ov = overrides[dateStr];
    setDraft(new Set(Array.isArray(ov) ? ov : ALL_FROMS));
  };

  const closeEditor = () => setSelectedDate(null);

  const toggleDraftWindow = (from) => setDraft((prev) => {
    const next = new Set(prev);
    if (next.has(from)) next.delete(from);
    else next.add(from);
    return next;
  });

  const applyEditor = () => {
    const next = { ...overrides };
    if (draft.size === ALL_FROMS.length) {
      delete next[selectedDate]; // fully open → no override needed
    } else {
      next[selectedDate] = ALL_FROMS.filter((f) => draft.has(f)); // [] = closed; subset = partial
    }
    persist(next);
    closeEditor();
  };

  const resetDate = () => {
    const next = { ...overrides };
    delete next[selectedDate];
    persist(next);
    closeEditor();
  };

  const blockRange = () => {
    if (!rangeStart || !rangeEnd) return;
    const next = { ...overrides };
    dateRange(rangeStart, rangeEnd).forEach((d) => {
      if (d >= today) next[d] = [];
    });
    persist(next);
    setRangeStart('');
    setRangeEnd('');
  };

  const draftClosed = draft.size === 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-walnut">Availability</h1>
          <p className="mt-1 text-sm text-walnut-400">
            Every upcoming date is open by default. Tap a date to close it (out of town) or
            limit its time windows. Changes save automatically.
          </p>
        </div>
        {saved && <span className="text-sm font-semibold text-green-700">Saved ✓</span>}
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {!loading && (
        <div className="mt-6 rounded-xl border border-cream-300 bg-white p-5">
          <h2 className="text-base font-bold text-walnut">Scheduling rules</h2>
          <div className="mt-3 flex flex-wrap items-end gap-5">
            <div>
              <label htmlFor="lead-days" className="block text-xs font-semibold text-walnut">Minimum notice (days)</label>
              <input
                id="lead-days"
                type="number"
                min={0}
                value={leadDays}
                onChange={(e) => setLeadDays(e.target.value)}
                className="mt-1 w-24 rounded-lg border border-cream-300 px-3 py-2 text-sm text-walnut"
              />
              <p className="mt-1 text-xs text-walnut-300">0 = same-day OK · 1 = next-day</p>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-walnut">
              <input
                type="checkbox"
                checked={rushEnabled}
                onChange={(e) => setRushEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
              />
              Offer rush orders
            </label>
            <div>
              <label htmlFor="rush-percent" className="block text-xs font-semibold text-walnut">Rush surcharge (%)</label>
              <input
                id="rush-percent"
                type="number"
                min={0}
                value={rushPercent}
                disabled={!rushEnabled}
                onChange={(e) => setRushPercent(e.target.value)}
                className="mt-1 w-24 rounded-lg border border-cream-300 px-3 py-2 text-sm text-walnut disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={saveRules}
              className="rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600"
            >
              Save rules
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-walnut-400">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <MonthCalendar
              getDayState={getDayState}
              onSelectDate={openEditor}
            />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-walnut-400">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded border border-cream-300 bg-white" />
                <span>Open</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded border border-amber-300 bg-amber-50" />
                <span>Limited</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded border border-red-300 bg-red-50" />
                <span>Closed</span>
              </span>
            </div>

            {/* Block a vacation range */}
            <div className="mt-6 rounded-xl border border-cream-300 bg-white p-4">
              <p className="text-sm font-bold text-walnut">Block a range (out of town)</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="range-start" className="block text-xs font-semibold text-walnut">From</label>
                  <input
                    id="range-start"
                    type="date"
                    min={today}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="mt-1 rounded-lg border border-cream-300 px-3 py-2 text-sm text-walnut"
                  />
                </div>
                <div>
                  <label htmlFor="range-end" className="block text-xs font-semibold text-walnut">To</label>
                  <input
                    id="range-end"
                    type="date"
                    min={rangeStart || today}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="mt-1 rounded-lg border border-cream-300 px-3 py-2 text-sm text-walnut"
                  />
                </div>
                <button
                  type="button"
                  onClick={blockRange}
                  disabled={!rangeStart || !rangeEnd}
                  className="rounded-lg bg-walnut px-4 py-2 text-sm font-semibold text-white hover:bg-walnut-400 disabled:opacity-50"
                >
                  Close these dates
                </button>
              </div>
            </div>
          </div>

          {/* Per-date editor */}
          <div>
            {selectedDate ? (
              <div className="rounded-xl border border-cream-300 bg-white p-5">
                <h2 className="text-base font-bold text-walnut">{formatDayLabel(selectedDate)}</h2>

                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-walnut">
                  <input
                    type="checkbox"
                    checked={draftClosed}
                    onChange={() => setDraft(new Set(draftClosed ? ALL_FROMS : []))}
                    className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
                  />
                  Closed all day (out of town)
                </label>

                <p className="mt-4 text-sm font-semibold text-walnut">Available windows</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIME_WINDOWS.map((w) => {
                    const on = draft.has(w.from);
                    return (
                      <button
                        type="button"
                        key={w.from}
                        onClick={() => toggleDraftWindow(w.from)}
                        className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                          on
                            ? 'border-ember bg-ember text-white'
                            : 'border-cream-300 bg-white text-walnut hover:border-ember'
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyEditor}
                    className="rounded-xl bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={resetDate}
                    className="rounded-xl border border-cream-300 px-4 py-2 text-sm font-semibold text-walnut hover:border-ember"
                  >
                    Reset to open
                  </button>
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-walnut-400 hover:text-walnut"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-cream-300 bg-cream-100 p-5 text-sm text-walnut-400">
                Tap a date on the calendar to edit its availability.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAvailability;
