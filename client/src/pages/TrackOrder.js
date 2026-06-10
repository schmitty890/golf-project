import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  describeOrder, fulfillmentLabel, formatPreferredSchedule, formatSchedule,
  STATUS_STEPS, statusLabel, normalizeStatus, paymentStatusClasses, paymentLabel,
} from '../utils/orderDisplay';
import business from '../data/business';
import { subscriptionMonthly, bundlesFromPlan } from '../data/pricing';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Timestamp (from statusHistory) for a given canonical step, if reached.
function stepTime(order, step) {
  const hit = (order.statusHistory || []).find((e) => normalizeStatus(e.status) === step);
  return hit?.at ? new Date(hit.at).toLocaleString() : '';
}

function TrackOrder() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/api/orders/track/${token}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.response?.status === 404 ? 'notfound' : 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="mx-auto max-w-xl px-4 py-16 text-center text-walnut-400">Loading…</p>;

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-walnut">
          {error === 'notfound' ? "We couldn't find that order" : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-walnut-400">Double-check your tracking link, or contact us if it keeps happening.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-ember px-6 py-3 text-sm font-semibold text-white hover:bg-ember-600">
          Back home
        </Link>
      </div>
    );
  }

  const cancelled = normalizeStatus(order.status) === 'cancelled';
  const currentIndex = STATUS_STEPS.indexOf(normalizeStatus(order.status));
  const when = formatSchedule(order.schedule) || formatPreferredSchedule(order);

  // Still-unpaid orders get another Venmo pay link here (hidden once the owner marks it paid).
  const handle = (order.venmoHandle || '').replace(/^@/, '');
  const amount = order.orderType === 'subscription'
    ? (order.subscriptionMonthly || subscriptionMonthly(order.subscriptionBundles || bundlesFromPlan(order.subscriptionPlan)) || '')
    : (order.total || '');
  const venmoNote = `${business.name} firewood order`;
  const venmoUrl = handle
    ? `https://venmo.com/${handle}?txn=pay${amount ? `&amount=${amount}` : ''}&note=${encodeURIComponent(venmoNote)}`
    : '';
  const showPay = order.paymentStatus !== 'paid' && !cancelled && venmoUrl;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold text-ember">Order tracking</p>
      <h1 className="mt-1 text-2xl font-extrabold text-walnut">
        {order.customerName ? `Hi ${order.customerName}!` : 'Your order'}
      </h1>

      <div className="mt-6 rounded-2xl border border-cream-300 bg-white p-5 shadow-sm">
        <p className="font-semibold text-walnut">{describeOrder(order)}</p>
        <p className="mt-1 text-sm text-walnut-400">
          {fulfillmentLabel(order)}
          {when ? ` · ${when}` : ''}
        </p>
        <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusClasses[order.paymentStatus] || paymentStatusClasses.unpaid}`}>
          {paymentLabel(order)}
        </span>

        {showPay && (
          <div className="mt-4 border-t border-cream-300 pt-4">
            <a
              href={venmoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center rounded-xl bg-[#3D95CE] px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              {amount ? `Pay $${amount} with Venmo` : 'Pay with Venmo'}
              {` · @${handle}`}
            </a>
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Still unpaid — pay now so we can set out or deliver your order.
            </p>
            <p className="mt-1 text-xs text-walnut-400">
              Already sent your Venmo? It can take us a little while to confirm and update this — we
              mark payments by hand, so thanks for your patience.
            </p>
          </div>
        )}
      </div>

      {order.pickupAddress && !cancelled && (
        <div className="mt-6 rounded-2xl border border-ember/30 bg-ember/5 p-5">
          <h2 className="text-base font-bold text-walnut">Where to pick up</h2>
          <p className="mt-1 text-sm text-walnut">{order.pickupAddress}</p>
        </div>
      )}

      {cancelled ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <h2 className="text-lg font-bold text-red-700">This order was cancelled</h2>
          <p className="mt-1 text-sm text-red-600">If that&apos;s a surprise, please reach out to us.</p>
        </div>
      ) : (
        <ol className="mt-8 space-y-5">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentIndex;
            const current = i === currentIndex;
            return (
              <li key={step} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? 'bg-ember text-white' : 'border-2 border-cream-300 bg-white text-cream-300'}`}>
                  {done ? <CheckCircleIcon className="h-5 w-5" aria-hidden="true" /> : <span className="text-xs font-bold">{i + 1}</span>}
                </span>
                <div>
                  <p className={`text-sm font-bold ${done ? 'text-walnut' : 'text-walnut-300'}`}>
                    {statusLabel(step, order.fulfillment)}
                    {current && <span className="ml-2 rounded-full bg-ember/10 px-2 py-0.5 text-xs font-semibold text-ember">Current</span>}
                  </p>
                  {stepTime(order, step) && <p className="text-xs text-walnut-400">{stepTime(order, step)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-8 text-center text-xs text-walnut-300">Bookmark this page to check back anytime.</p>
    </div>
  );
}

export default TrackOrder;
