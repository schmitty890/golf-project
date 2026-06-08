/* eslint-disable no-underscore-dangle, jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { TrashIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';
import { TIME_WINDOWS } from '../../data/pricing';
import {
  describeOrder, statusClasses, STATUS_OPTIONS, fulfillmentLabel, formatSchedule,
  statusTimeline, statusEventLabel, formatPreferredSchedule,
  paymentStatusClasses, paymentLabel,
} from '../../utils/orderDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function AdminOrders() {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [scheduleState, setScheduleState] = useState({});

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (typeFilter !== 'all') params.set('orderType', typeFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`${API_URL}/api/orders${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [token, filter, typeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/api/orders/${id}`, { status }, authHeaders);
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update order');
    }
  };

  const updatePayment = async (id, paymentStatus) => {
    try {
      const res = await axios.patch(`${API_URL}/api/orders/${id}`, { paymentStatus }, authHeaders);
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, ...res.data } : o)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update payment');
    }
  };

  const updateScheduleField = (id, field, value) => {
    setOrders((prev) => prev.map((o) => (
      o._id === id ? { ...o, schedule: { ...o.schedule, [field]: value } } : o
    )));
  };

  const setSchedState = (id, val) => setScheduleState((prev) => ({ ...prev, [id]: val }));

  const saveSchedule = async (id) => {
    const order = orders.find((o) => o._id === id);
    setSchedState(id, 'saving');
    try {
      await axios.patch(`${API_URL}/api/orders/${id}`, { schedule: order.schedule || {} }, authHeaders);
      setSchedState(id, 'saved');
      setTimeout(() => setSchedState(id, undefined), 2000);
    } catch (err) {
      setSchedState(id, 'error');
      setTimeout(() => setSchedState(id, undefined), 3000);
    }
  };

  // One-click confirm: turn a customer's preferred window into the official schedule.
  const confirmWindow = async (order, w) => {
    try {
      const schedule = { date: order.preferredDate, from: w.from, to: w.to };
      const res = await axios.patch(`${API_URL}/api/orders/${order._id}`, { schedule, status: 'confirmed' }, authHeaders);
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.data } : o)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm window');
    }
  };

  const deleteOrder = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this order? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/api/orders/${id}`, authHeaders);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete order');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-walnut">Orders</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="type-filter" className="text-sm font-semibold text-walnut">Type</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-cream-300 bg-white px-3 py-1.5 text-sm text-walnut focus:outline-ember"
            >
              <option value="all">All</option>
              <option value="bundle">Bundles</option>
              <option value="pack">Seasonal Packs</option>
              <option value="subscription">Subscriptions</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-semibold text-walnut">Status</label>
            <select
              id="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border border-cream-300 bg-white px-3 py-1.5 text-sm text-walnut focus:outline-ember"
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="mt-8 text-walnut-400">Loading…</p>}
      {error && <p className="mt-8 text-red-600">{error}</p>}

      {!loading && orders.length === 0 && (
        <p className="mt-12 text-center text-walnut-400">No orders found.</p>
      )}

      <ul className="mt-8 space-y-4">
        {orders.map((order) => (
          <li key={order._id} className="rounded-lg border border-cream-300 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-walnut">
                  {describeOrder(order)}
                  <span className="ml-2 rounded-full bg-cream-300 px-2 py-0.5 text-xs font-semibold text-walnut">
                    {fulfillmentLabel(order)}
                  </span>
                  {order.rush && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      {`RUSH +${order.rushPercent || 0}%`}
                    </span>
                  )}
                  {order.promoCode && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                      {`${order.promoCode} −$${order.discount || 0}`}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-walnut-400">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-walnut">
                  <span className="font-semibold">{order.contact?.name}</span>
                  {' · '}
                  <a href={`tel:${order.contact?.phone}`} className="text-ember hover:underline">
                    {order.contact?.phone}
                  </a>
                  {order.contact?.email ? ` · ${order.contact.email}` : ''}
                </p>
                {order.referredBy && (
                  <p className="text-sm font-semibold text-green-700">
                    {`Referred by ${[order.referredBy.firstName, order.referredBy.lastName].filter(Boolean).join(' ') || order.referredBy.email}`}
                  </p>
                )}
                {order.orderType === 'subscription' && order.commitmentEndsAt && (
                  <p className="text-sm text-walnut-400">
                    {`Commitment ends ${new Date(order.commitmentEndsAt).toLocaleDateString()}`}
                  </p>
                )}
                <p className="text-sm text-walnut-400">
                  {order.fulfillment === 'pickup' ? (
                    'Pickup — coordinate spot & time'
                  ) : (
                    <>
                      {order.deliveryAddress?.street}
                      {order.deliveryAddress?.unit ? `, ${order.deliveryAddress.unit}` : ''}
                      {order.deliveryAddress?.neighborhood ? ` · ${order.deliveryAddress.neighborhood}` : ''}
                      {order.deliveryAddress?.notes ? ` — ${order.deliveryAddress.notes}` : ''}
                    </>
                  )}
                </p>
                {formatPreferredSchedule(order) && (
                  <p className="text-sm font-semibold text-walnut">
                    Preferred:
                    {' '}
                    {formatPreferredSchedule(order)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[order.status] || ''}`}>
                  {order.status}
                </span>
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order._id, e.target.value)}
                  aria-label="Update status"
                  className="rounded-md border border-cream-300 bg-white px-2 py-1 text-sm text-walnut capitalize focus:outline-ember"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusClasses[order.paymentStatus] || paymentStatusClasses.unpaid}`}>
                  {order.paymentMethod === 'card' ? 'Card — ' : ''}
                  {paymentLabel(order)}
                  {order.paymentStatus === 'paid' && order.paidAt
                    ? ` · ${new Date(order.paidAt).toLocaleDateString()}`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={() => updatePayment(
                    order._id,
                    order.paymentStatus === 'paid' ? 'unpaid' : 'paid',
                  )}
                  className="rounded-md border border-cream-300 px-2 py-1 text-sm font-semibold text-walnut hover:border-ember"
                >
                  {order.paymentStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteOrder(order._id)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Delete order"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Schedule editor */}
            <div className="mt-4 border-t border-cream-300 pt-3">
              {(order.preferredTimes || []).length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-walnut-300">Confirm window:</span>
                  {order.preferredTimes.map((w) => {
                    const win = TIME_WINDOWS.find((x) => x.from === w.from && x.to === w.to);
                    return (
                      <button
                        type="button"
                        key={w.from}
                        onClick={() => confirmWindow(order, w)}
                        className="rounded-lg border border-ember bg-white px-3 py-1 text-sm font-semibold text-ember hover:bg-ember hover:text-white"
                      >
                        {win ? win.label : `${w.from}–${w.to}`}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor={`date-${order._id}`} className="block text-xs font-semibold text-walnut">Date</label>
                  <input
                    id={`date-${order._id}`}
                    type="date"
                    value={order.schedule?.date || ''}
                    onChange={(e) => updateScheduleField(order._id, 'date', e.target.value)}
                    className="mt-1 rounded-md border border-cream-300 bg-white px-2 py-1 text-sm text-walnut focus:outline-ember"
                  />
                </div>
                <div>
                  <label htmlFor={`from-${order._id}`} className="block text-xs font-semibold text-walnut">From</label>
                  <input
                    id={`from-${order._id}`}
                    type="time"
                    value={order.schedule?.from || ''}
                    onChange={(e) => updateScheduleField(order._id, 'from', e.target.value)}
                    className="mt-1 rounded-md border border-cream-300 bg-white px-2 py-1 text-sm text-walnut focus:outline-ember"
                  />
                </div>
                <div>
                  <label htmlFor={`to-${order._id}`} className="block text-xs font-semibold text-walnut">To</label>
                  <input
                    id={`to-${order._id}`}
                    type="time"
                    value={order.schedule?.to || ''}
                    onChange={(e) => updateScheduleField(order._id, 'to', e.target.value)}
                    className="mt-1 rounded-md border border-cream-300 bg-white px-2 py-1 text-sm text-walnut focus:outline-ember"
                  />
                </div>
                {(() => {
                  const st = scheduleState[order._id] || 'idle';
                  const colorMap = {
                    idle: 'bg-ember hover:bg-ember-600',
                    saving: 'bg-ember hover:bg-ember-600',
                    saved: 'bg-green-600 hover:bg-green-600',
                    error: 'bg-red-600 hover:bg-red-600',
                  };
                  const labelMap = {
                    idle: 'Save schedule',
                    saving: 'Saving…',
                    saved: 'Saved ✓',
                    error: 'Error — try again',
                  };
                  return (
                    <button
                      type="button"
                      onClick={() => saveSchedule(order._id)}
                      disabled={st === 'saving'}
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${colorMap[st]}`}
                    >
                      {labelMap[st]}
                    </button>
                  );
                })()}
                {formatSchedule(order.schedule) && (
                  <span className="text-sm text-walnut-400">
                    {fulfillmentLabel(order)}
                    :
                    {' '}
                    {formatSchedule(order.schedule)}
                  </span>
                )}
              </div>
            </div>

            {/* Status timeline */}
            <ul className="mt-3 space-y-1 border-t border-cream-300 pt-3">
              {statusTimeline(order).map((e) => (
                <li key={`${e.status}-${e.at}`} className="flex justify-between gap-3 text-xs text-walnut-400">
                  <span className="font-semibold text-walnut">{statusEventLabel(e.status)}</span>
                  <span>{e.at ? new Date(e.at).toLocaleString() : ''}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminOrders;
