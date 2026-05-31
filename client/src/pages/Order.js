/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';
import business from '../data/business';
import {
  bundles, getActivePacks, subscriptions, seasons,
} from '../data/pricing';

const activePacks = getActivePacks();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const inputClass = 'block w-full rounded-md bg-white px-3 py-2 text-base text-walnut outline outline-1 -outline-offset-1 outline-cream-300 placeholder:text-walnut-200 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ember sm:text-sm';
const labelClass = 'block text-sm font-semibold text-walnut';

function Order() {
  const { user, token } = useContext(AuthContext);

  const [orderType, setOrderType] = useState('bundle');
  const [bundleId, setBundleId] = useState(bundles[0].id);
  const [quantity, setQuantity] = useState(1);
  const [packId, setPackId] = useState(activePacks[0]?.id || '');
  const [subscriptionPlan, setSubscriptionPlan] = useState(subscriptions[0].plan);
  const [season, setSeason] = useState(seasons[0].id);

  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState({ street: '', unit: '', notes: '' });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedBundle = bundles.find((b) => b.id === bundleId);
  const minQty = selectedBundle?.minQty || 1;

  // "Seasonal Pack" is only offered when at least one pack is in season today.
  const orderTypeOptions = [
    { id: 'bundle', label: 'Bundles' },
    ...(activePacks.length > 0 ? [{ id: 'pack', label: 'Seasonal Pack' }] : []),
    { id: 'subscription', label: 'Subscription' },
  ];

  // Prefill contact info for logged-in users.
  useEffect(() => {
    if (user) {
      setContact((prev) => ({
        name: prev.name || [user.firstName, user.lastName].filter(Boolean).join(' '),
        phone: prev.phone,
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  // Keep quantity at or above the selected bundle's minimum (delivered bundles require 2).
  useEffect(() => {
    setQuantity((q) => (Number(q) < minQty ? minQty : q));
  }, [minQty]);

  const buildPayload = () => {
    const base = { orderType, contact, deliveryAddress: address };
    if (orderType === 'bundle') {
      const bundle = bundles.find((b) => b.id === bundleId);
      return {
        ...base,
        items: [{
          name: bundle.name,
          quantity: Number(quantity),
          unitPrice: bundle.unitPrice,
        }],
      };
    }
    if (orderType === 'pack') {
      const pack = activePacks.find((p) => p.id === packId);
      return { ...base, packName: pack.name, bundleCount: pack.bundleCount };
    }
    // subscription
    return {
      ...base,
      subscriptionPlan,
      season: subscriptionPlan === 'seasonal' ? season : '',
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (orderType === 'bundle' && Number(quantity) < minQty) {
      setError(`The ${selectedBundle.name} has a ${minQty}-bundle minimum.`);
      return;
    }

    setSubmitting(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API_URL}/api/orders`, buildPayload(), { headers });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-ember" aria-hidden="true" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-walnut">Order received!</h1>
        <p className="mt-4 text-walnut-400">
          Thanks for your order. We&apos;ll reach out to confirm details and arrange delivery.
          For anything urgent, email us at
          {' '}
          <a href={`mailto:${business.email}`} className="font-semibold text-ember">{business.email}</a>
          .
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/" className="rounded-md bg-cream-300 px-5 py-2.5 text-sm font-semibold text-walnut hover:bg-cream-400">
            Back home
          </Link>
          {token && (
            <Link to="/my-orders" className="rounded-md bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-600">
              View my orders
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-walnut">Order Firewood</h1>
      <p className="mt-2 text-walnut-400">
        Premium bundles delivered in
        {' '}
        {business.serviceArea}
        . No payment now — we&apos;ll confirm and arrange payment with you.
      </p>

      {!token && (
        <p className="mt-4 rounded-md bg-cream-300/60 px-4 py-3 text-sm text-walnut">
          Ordering as a guest.
          {' '}
          <Link to="/login" className="font-semibold text-ember">Sign in</Link>
          {' '}
          to track your orders.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* Order type */}
        <div>
          <span className={labelClass}>What would you like?</span>
          <div className={`mt-2 grid gap-3 ${orderTypeOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {orderTypeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setOrderType(opt.id)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                  orderType === opt.id
                    ? 'border-ember bg-ember text-white'
                    : 'border-cream-300 bg-white text-walnut hover:border-ember'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional fields */}
        {orderType === 'bundle' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="bundle" className={labelClass}>Bundle</label>
              <select id="bundle" value={bundleId} onChange={(e) => setBundleId(e.target.value)} className={`mt-2 ${inputClass}`}>
                {bundles.map((b) => (
                  <option key={b.id} value={b.id}>{`${b.name} — ${b.price}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className={labelClass}>Quantity</label>
              <input
                id="quantity"
                type="number"
                min={minQty}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`mt-2 ${inputClass}`}
              />
              {minQty > 1 && (
                <p className="mt-1 text-xs text-walnut-300">
                  {`${minQty}-bundle minimum for delivery.`}
                </p>
              )}
            </div>
          </div>
        )}

        {orderType === 'pack' && (
          <div>
            <label htmlFor="pack" className={labelClass}>Seasonal pack</label>
            <select id="pack" value={packId} onChange={(e) => setPackId(e.target.value)} className={`mt-2 ${inputClass}`}>
              {activePacks.map((p) => (
                <option key={p.id} value={p.id}>{`${p.name} — ${p.bundleCount} bundles`}</option>
              ))}
            </select>
          </div>
        )}

        {orderType === 'subscription' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="plan" className={labelClass}>Plan</label>
              <select id="plan" value={subscriptionPlan} onChange={(e) => setSubscriptionPlan(e.target.value)} className={`mt-2 ${inputClass}`}>
                {subscriptions.map((s) => (
                  <option key={s.id} value={s.plan}>{`${s.name} — ${s.cadence}`}</option>
                ))}
              </select>
            </div>
            {subscriptionPlan === 'seasonal' && (
              <div>
                <label htmlFor="season" className={labelClass}>Season</label>
                <select id="season" value={season} onChange={(e) => setSeason(e.target.value)} className={`mt-2 ${inputClass}`}>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Delivery address */}
        <fieldset className="space-y-4">
          <legend className="text-base font-bold text-walnut">Delivery address</legend>
          <div>
            <label htmlFor="street" className={labelClass}>Street address</label>
            <input id="street" type="text" required value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="unit" className={labelClass}>Unit / apt (optional)</label>
            <input id="unit" type="text" value={address.unit} onChange={(e) => setAddress({ ...address, unit: e.target.value })} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="notes" className={labelClass}>Delivery notes (optional)</label>
            <textarea id="notes" rows={2} value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} className={`mt-2 ${inputClass}`} />
          </div>
        </fieldset>

        {/* Contact */}
        <fieldset className="space-y-4">
          <legend className="text-base font-bold text-walnut">Your contact info</legend>
          <div>
            <label htmlFor="name" className={labelClass}>Name</label>
            <input id="name" type="text" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={`mt-2 ${inputClass}`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelClass}>Phone</label>
              <input id="phone" type="tel" required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={`mt-2 ${inputClass}`} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email (optional)</label>
              <input id="email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={`mt-2 ${inputClass}`} />
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-ember px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-ember-600 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}

export default Order;
