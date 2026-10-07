/* eslint-disable no-underscore-dangle, react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import business from '../data/business';
import MonthCalendar from './MonthCalendar';
import { todayStr, addDays, formatDayLabel } from '../utils/dates';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Lets a customer re-pick the delivery day for an existing order, using the same
// availability/lead-time/rush rules as the order form. Mirrors Order.js's date logic.
function RescheduleModal({
  open, onClose, order, onRescheduled,
}) {
  const { token } = useContext(AuthContext);
  const [dateOverrides, setDateOverrides] = useState({});
  const [leadDays, setLeadDays] = useState(1);
  const [rushEnabled, setRushEnabled] = useState(true);
  const [rushPercent, setRushPercent] = useState(25);
  const [rushRequested, setRushRequested] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => {
        setDateOverrides(res.data.dateOverrides || {});
        if (res.data.leadDays !== undefined) setLeadDays(res.data.leadDays);
        if (res.data.rushEnabled !== undefined) setRushEnabled(res.data.rushEnabled);
        if (res.data.rushPercent !== undefined) setRushPercent(res.data.rushPercent);
      })
      .catch(() => {});
  }, [open]);

  const today = todayStr();
  const earliest = addDays(today, leadDays);
  // dateOverrides[date] = [] marks a closed day.
  const isClosed = (date) => Array.isArray(dateOverrides[date]) && dateOverrides[date].length === 0;
  const isRushDate = (date) => date >= today && date < earliest;
  const dateIsOpen = (date) => date >= today
    && !isClosed(date)
    && (date >= earliest || (rushEnabled && rushRequested));
  const isRush = Boolean(preferredDate) && isRushDate(preferredDate);

  const getDayState = (date) => {
    if (date < today) return { disabled: true, tone: 'open' };
    const closed = isClosed(date);
    const rushWindow = isRushDate(date);
    return {
      disabled: closed || (rushWindow && !(rushEnabled && rushRequested)),
      // eslint-disable-next-line no-nested-ternary
      tone: closed ? 'closed' : (rushWindow ? 'rush' : 'open'),
      selected: date === preferredDate,
    };
  };

  // Clear an in-window date if rush is turned off.
  useEffect(() => {
    if (!rushRequested && preferredDate && isRushDate(preferredDate)) setPreferredDate('');
  }, [rushRequested, preferredDate, earliest]);

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (!preferredDate || !dateIsOpen(preferredDate)) {
      setError('Please choose an available date.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.patch(`${API_URL}/api/orders/${order._id}/reschedule`, {
        preferredDate,
        rush: isRush,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRescheduled(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reschedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-walnut/60 transition-opacity"
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
        <div className="relative w-full transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all sm:my-8 sm:max-w-lg">
          <h3 className="text-xl font-extrabold text-walnut">Reschedule order</h3>
          <p className="mt-1 text-sm text-walnut-400">{`Pick a new delivery day — we deliver by ${business.deliverBy}.`}</p>

          {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          {rushEnabled && leadDays > 0 && (
            <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border border-cream-300 bg-cream-100 p-3">
              <input
                type="checkbox"
                checked={rushRequested}
                onChange={(e) => setRushRequested(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
              />
              <span className="text-sm text-walnut">
                <span className="font-semibold">In a pinch? Request a rush.</span>
                {` Unlocks sooner dates for a ${rushPercent}% rush charge — subject to availability.`}
              </span>
            </label>
          )}

          <div className="mt-4">
            <MonthCalendar getDayState={getDayState} onSelectDate={setPreferredDate} />
          </div>
          <p className="mt-1 text-xs text-walnut-300">
            {preferredDate
              ? `Selected: ${formatDayLabel(preferredDate)}${isRush ? ' · rush' : ''}.`
              : 'Pick a delivery day.'}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save new day'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-cream-300 px-4 py-3 text-base font-semibold text-walnut hover:border-ember"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

RescheduleModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  order: PropTypes.object,
  onRescheduled: PropTypes.func.isRequired,
};

RescheduleModal.defaultProps = {
  order: {},
};

export default RescheduleModal;
