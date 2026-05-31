/* eslint-disable no-underscore-dangle */
import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ClockIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../context/AuthContext';
import {
  describeOrder, statusClasses, fulfillmentLabel, formatSchedule,
  statusTimeline, statusEventLabel,
} from '../utils/orderDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function MyOrders() {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <Link
          to="/order"
          className="rounded-md bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember-600"
        >
          New Order
        </Link>
      </div>

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
                <p className="font-semibold text-walnut">{describeOrder(order)}</p>
                <p className="mt-1 text-sm text-walnut-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                  {' · '}
                  {fulfillmentLabel(order)}
                  {order.fulfillment !== 'pickup' && order.deliveryAddress?.street
                    ? ` · ${order.deliveryAddress.street}`
                    : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[order.status] || ''}`}>
                {order.status}
              </span>
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

export default MyOrders;
