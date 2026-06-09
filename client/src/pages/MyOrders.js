/* eslint-disable no-underscore-dangle */
import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ClockIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../context/AuthContext';
import FeedbackModal from '../components/FeedbackModal';
import RescheduleModal from '../components/RescheduleModal';
import {
  describeOrder, statusClasses, fulfillmentLabel, formatSchedule,
  statusTimeline, statusEventLabel, formatPreferredSchedule,
  paymentStatusClasses, paymentLabel, statusLabel,
} from '../utils/orderDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// A subscription is locked in until its minimum commitment ends.
function withinCommitment(order) {
  return order.orderType === 'subscription'
    && order.commitmentEndsAt
    && new Date(order.commitmentEndsAt) > new Date();
}

// Build an "Order again" prefill payload from a past order (cart model).
function buildReorder(order) {
  return {
    orderType: order.orderType === 'subscription' ? 'subscription' : 'onetime',
    items: (order.items || []).map((i) => ({ name: i.name, quantity: i.quantity })),
    subscriptionPlan: order.subscriptionPlan,
    subscriptionBundles: order.subscriptionBundles,
    subscriptionWeek: order.subscriptionWeek,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress || {},
  };
}

function MyOrders() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rescheduleOrder, setRescheduleOrder] = useState(null);

  const cancelOrder = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    try {
      const res = await axios.patch(`${API_URL}/api/orders/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, ...res.data } : o)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/orders/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-walnut">My Orders</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="rounded-md border border-ember px-4 py-2 text-sm font-semibold text-ember hover:bg-ember hover:text-white"
          >
            Leave feedback
          </button>
          <Link
            to="/order"
            className="rounded-md bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember-600"
          >
            New Order
          </Link>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <RescheduleModal
        open={!!rescheduleOrder}
        order={rescheduleOrder || {}}
        onClose={() => setRescheduleOrder(null)}
        onRescheduled={(updated) => setOrders((prev) => (
          prev.map((o) => (o._id === updated._id ? { ...o, ...updated } : o))
        ))}
      />

      {loading && <p className="mt-8 text-walnut-400">Loading…</p>}
      {error && <p className="mt-8 text-red-600">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="mt-12 rounded-lg border border-dashed border-cream-300 p-12 text-center">
          <p className="text-walnut-400">You haven&apos;t placed any orders yet.</p>
          <Link to="/order" className="mt-4 inline-block font-semibold text-ember hover:text-ember-600">
            Place your first order →
          </Link>
        </div>
      )}

      <ul className="mt-8 space-y-4">
        {orders.map((order) => (
          <li key={order._id} className="rounded-lg border border-cream-300 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-walnut">
                  {describeOrder(order)}
                  {order.rush && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      Rush
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-walnut-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                  {' · '}
                  {fulfillmentLabel(order)}
                  {order.fulfillment !== 'pickup' && order.deliveryAddress?.street
                    ? ` · ${order.deliveryAddress.street}`
                    : ''}
                </p>
                {formatPreferredSchedule(order) && (
                  <p className="mt-1 text-sm text-walnut-400">
                    Preferred:
                    {' '}
                    {formatPreferredSchedule(order)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[order.status] || ''}`}>
                  {statusLabel(order.status, order.fulfillment)}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusClasses[order.paymentStatus] || paymentStatusClasses.unpaid}`}>
                  {paymentLabel(order)}
                </span>
              </div>
            </div>
            {formatSchedule(order.schedule) && (
              <p className="mt-3 flex items-center gap-2 rounded-md bg-cream-300/50 px-3 py-2 text-sm font-semibold text-walnut">
                <ClockIcon className="h-5 w-5 shrink-0 text-ember" aria-hidden="true" />
                {order.fulfillment === 'pickup' ? 'Ready for pickup:' : 'Delivery:'}
                {' '}
                {formatSchedule(order.schedule)}
              </p>
            )}
            <ul className="mt-3 space-y-1 border-t border-cream-300 pt-3">
              {statusTimeline(order).map((e) => (
                <li key={`${e.status}-${e.at}`} className="flex justify-between gap-3 text-xs text-walnut-400">
                  <span className="font-semibold text-walnut">{statusEventLabel(e.status, order.fulfillment)}</span>
                  <span>{e.at ? new Date(e.at).toLocaleString() : ''}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-cream-300 pt-3">
              {order.trackingToken && (
                <Link
                  to={`/track/${order.trackingToken}`}
                  className="rounded-lg border border-cream-300 px-3 py-1.5 text-sm font-semibold text-walnut hover:border-ember"
                >
                  Track
                </Link>
              )}
              <button
                type="button"
                onClick={() => navigate('/order', { state: { reorder: buildReorder(order) } })}
                className="rounded-lg border border-ember px-3 py-1.5 text-sm font-semibold text-ember hover:bg-ember hover:text-white"
              >
                Order again
              </button>
              {['pending', 'confirmed'].includes(order.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => setRescheduleOrder(order)}
                    className="rounded-lg border border-cream-300 px-3 py-1.5 text-sm font-semibold text-walnut hover:border-ember"
                  >
                    Reschedule
                  </button>
                  {withinCommitment(order) ? (
                    <span className="self-center text-xs text-walnut-400">
                      {`${order.commitmentMonths || 3}-month minimum — contact us to change your subscription.`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cancelOrder(order._id)}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MyOrders;
