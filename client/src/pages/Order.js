/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  TruckIcon, BuildingStorefrontIcon, PlusIcon, MinusIcon,
} from '@heroicons/react/24/outline';
import { AuthContext } from '../context/AuthContext';
import business from '../data/business';
import {
  products, subscriptions, getSubscription, DELIVERY_FEE, TIME_WINDOWS,
} from '../data/pricing';
import MonthCalendar from '../components/MonthCalendar';
import ReferralShare from '../components/ReferralShare';
import neighborhoods from '../data/neighborhoods';
import { todayStr, formatDayLabel, addDays } from '../utils/dates';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';
const labelClass = 'block text-sm font-semibold text-walnut';

function Order() {
  const { user, token } = useContext(AuthContext);
  const location = useLocation();
  const reorder = location.state?.reorder || null;

  // Reorder prefill: map past item names back to product ids; pick mode + fulfillment.
  const initialQty = (() => {
    const q = {};
    (reorder?.items || []).forEach((it) => {
      const p = products.find((x) => x.name === it.name);
      if (p) q[p.id] = Number(it.quantity) || 1;
    });
    return q;
  })();

  const [mode, setMode] = useState(reorder?.orderType === 'subscription' ? 'subscription' : 'onetime');
  const [qty, setQty] = useState(initialQty);
  const [subPlan, setSubPlan] = useState(
    subscriptions.some((s) => s.plan === reorder?.subscriptionPlan)
      ? reorder.subscriptionPlan : subscriptions[0].plan,
  );
  const [fulfillment, setFulfillment] = useState(reorder?.fulfillment === 'delivery' ? 'delivery' : 'pickup');

  const [preferredDate, setPreferredDate] = useState('');
  const [windowFroms, setWindowFroms] = useState([]);
  const [dateOverrides, setDateOverrides] = useState({});
  const [leadDays, setLeadDays] = useState(1);
  const [rushEnabled, setRushEnabled] = useState(true);
  const [rushPercent, setRushPercent] = useState(25);
  const [rushRequested, setRushRequested] = useState(false);
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('');

  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState(null); // { discount, label }
  const [codeError, setCodeError] = useState('');

  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState(reorder?.deliveryAddress ? {
    street: reorder.deliveryAddress.street || '',
    unit: reorder.deliveryAddress.unit || '',
    neighborhood: reorder.deliveryAddress.neighborhood || '',
    notes: reorder.deliveryAddress.notes || '',
  } : {
    street: '', unit: '', neighborhood: '', notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isSubscription = mode === 'subscription';
  // Subscriptions are always delivered; one-time orders choose pickup vs delivery.
  const isPickup = !isSubscription && fulfillment === 'pickup';
  const needsAddress = !isPickup;

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

  // Load admin availability + scheduling rules.
  useEffect(() => {
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => {
        setDateOverrides(res.data.dateOverrides || {});
        if (res.data.leadDays !== undefined) setLeadDays(res.data.leadDays);
        if (res.data.rushEnabled !== undefined) setRushEnabled(res.data.rushEnabled);
        if (res.data.rushPercent !== undefined) setRushPercent(res.data.rushPercent);
        if (res.data.pickupInstructions !== undefined) {
          setPickupInstructions(res.data.pickupInstructions);
        }
        if (res.data.venmoHandle !== undefined) setVenmoHandle(res.data.venmoHandle);
      })
      .catch(() => setDateOverrides({}));
  }, []);

  // --- Cart ---
  const setProductQty = (id, n) => setQty((prev) => ({ ...prev, [id]: Math.max(0, n) }));
  const cart = products
    .filter((p) => (qty[p.id] || 0) > 0)
    .map((p) => ({ ...p, count: qty[p.id] }));
  const itemsSub = cart.reduce((s, c) => s + c.price * c.count, 0);
  const selectedSub = getSubscription(subPlan);
  const deliveryFee = (!isSubscription && fulfillment === 'delivery') ? DELIVERY_FEE : 0;

  // --- Date / windows / rush ---
  const today = todayStr();
  const earliest = addDays(today, leadDays);
  const allFroms = TIME_WINDOWS.map((w) => w.from);
  const windowsForDate = (date) => {
    const ov = dateOverrides[date];
    return Array.isArray(ov) ? ov : allFroms;
  };
  const isRushDate = (date) => date >= today && date < earliest;
  const dateIsOpen = (date) => date >= today
    && windowsForDate(date).length > 0
    && (date >= earliest || (rushEnabled && rushRequested));
  const isRush = Boolean(preferredDate) && isRushDate(preferredDate);
  const availableFroms = new Set(preferredDate ? windowsForDate(preferredDate) : []);
  const selectedWindows = TIME_WINDOWS.filter((w) => windowFroms.includes(w.from));

  const toggleWindow = (from) => setWindowFroms((prev) => (
    prev.includes(from) ? prev.filter((f) => f !== from) : [...prev, from]
  ));

  const getDayState = (date) => {
    if (date < today) return { disabled: true, tone: 'open' };
    const ov = dateOverrides[date];
    const closed = Array.isArray(ov) && ov.length === 0;
    const rushWindow = isRushDate(date);
    return {
      disabled: closed || (rushWindow && !(rushEnabled && rushRequested)),
      // eslint-disable-next-line no-nested-ternary
      tone: closed ? 'closed' : (rushWindow ? 'rush' : 'open'),
      selected: date === preferredDate,
    };
  };

  useEffect(() => {
    setWindowFroms((prev) => {
      const next = prev.filter((f) => availableFroms.has(f));
      return next.length === prev.length ? prev : next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredDate, dateOverrides]);

  useEffect(() => {
    if (!rushRequested && preferredDate && isRushDate(preferredDate)) setPreferredDate('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rushRequested, preferredDate, earliest]);

  // --- Totals (one-time orders; subscriptions show the recurring tier price) ---
  const rushSurcharge = isRush ? Math.round(itemsSub * (rushPercent / 100)) : 0;
  const subtotalNum = itemsSub + rushSurcharge + deliveryFee; // pre-discount
  const discount = (!isSubscription && discountInfo?.discount) || 0;
  const finalTotalNum = Math.max(0, subtotalNum - discount);

  // --- Promo / referral code ---
  const applyCode = async () => {
    setCodeError('');
    const c = codeInput.trim();
    if (!c) return;
    try {
      const res = await axios.post(`${API_URL}/api/promos/validate`, { code: c, subtotal: subtotalNum });
      if (res.data.valid) {
        setAppliedCode(res.data.code);
        setDiscountInfo({ discount: res.data.discount, label: res.data.label });
      } else {
        setAppliedCode('');
        setDiscountInfo(null);
        setCodeError(res.data.message || 'That code isn’t valid.');
      }
    } catch {
      setCodeError('Could not check that code. Try again.');
    }
  };

  const removeCode = () => {
    setAppliedCode('');
    setDiscountInfo(null);
    setCodeInput('');
    setCodeError('');
  };

  useEffect(() => {
    if (!appliedCode || isSubscription) return undefined;
    let cancelled = false;
    axios.post(`${API_URL}/api/promos/validate`, { code: appliedCode, subtotal: subtotalNum })
      .then((res) => {
        if (!cancelled && res.data.valid) {
          setDiscountInfo({ discount: res.data.discount, label: res.data.label });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalNum, appliedCode, isSubscription]);

  const buildPayload = () => {
    const base = {
      fulfillment: isPickup ? 'pickup' : 'delivery',
      contact,
      deliveryAddress: needsAddress ? address : {},
      preferredDate,
      preferredTimes: selectedWindows.map((w) => ({ from: w.from, to: w.to })),
      rush: isRush,
      code: appliedCode,
      subtotal: subtotalNum,
    };
    if (isSubscription) {
      return { ...base, orderType: 'subscription', subscriptionPlan: subPlan };
    }
    return {
      ...base,
      orderType: 'onetime',
      items: cart.map((c) => ({ name: c.name, quantity: c.count, unitPrice: c.price })),
      deliveryFee,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isSubscription && cart.length === 0) {
      setError('Please add at least one item.');
      return;
    }
    if (!preferredDate || !dateIsOpen(preferredDate)) {
      setError('Please choose an available date.');
      return;
    }
    if (windowFroms.length === 0) {
      setError('Please choose at least one pickup/delivery time window.');
      return;
    }
    if (needsAddress && !address.street.trim()) {
      setError('Please enter a delivery address.');
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
    const handle = (venmoHandle || '').replace(/^@/, '');
    const amountNum = isSubscription ? String(selectedSub?.price || '') : String(finalTotalNum);
    const venmoNote = `${business.name} firewood order`;
    const venmoUrl = handle
      ? `https://venmo.com/${handle}?txn=pay${amountNum ? `&amount=${amountNum}` : ''}&note=${encodeURIComponent(venmoNote)}`
      : '';
    const windowsLabel = selectedWindows.map((w) => w.label).join(', ');
    const addressLine = [address.street, address.unit, address.neighborhood].filter(Boolean).join(', ');
    const orderLabel = isSubscription
      ? `${selectedSub?.name} subscription`
      : cart.map((c) => `${c.count}× ${c.name}`).join(', ');
    const summaryRows = [
      ['Order', orderLabel],
      ['When', `${formatDayLabel(preferredDate)}${windowsLabel ? ` · ${windowsLabel}` : ''}`],
      ['How', isPickup ? 'Curb pickup' : 'Delivery'],
      ...(needsAddress ? [['Address', addressLine]] : []),
      ...(isRush ? [['Rush', `Yes (+${rushPercent}%)`]] : []),
      ...(deliveryFee ? [['Delivery', `$${deliveryFee}`]] : []),
      ...(discount > 0 ? [['Promo', `${appliedCode} (−$${discount})`]] : []),
      [isSubscription ? 'Price' : 'Estimated total', isSubscription ? selectedSub?.priceLabel : `$${finalTotalNum}`],
    ].filter(([, v]) => v);

    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-ember" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-walnut">Order received!</h1>
          <p className="mt-2 text-walnut-400">Thanks! Here are your details — we&apos;ll confirm your time window shortly.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-cream-300 bg-cream-100 p-6 text-left">
          <dl className="space-y-2 text-sm">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="shrink-0 text-walnut-300">{label}</dt>
                <dd className="text-right font-semibold text-walnut">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 rounded-lg bg-white p-3 text-sm text-walnut">
            {isPickup
              ? (pickupInstructions || 'We’ll set your bundles out for your window.')
              : 'We’ll deliver within your window.'}
          </p>

          {venmoUrl && (
            <a
              href={venmoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#3D95CE] px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              {amountNum ? `Pay $${amountNum} with Venmo` : 'Pay with Venmo'}
              {` · @${handle}`}
            </a>
          )}
          <p className="mt-2 text-xs text-walnut-300">
            No payment needed to hold your order. After you send your Venmo payment, we&apos;ll mark
            your order as paid once we confirm the final total.
          </p>
        </div>

        <ReferralShare className="mt-6" />

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
        <p className="mt-6 text-center text-sm text-walnut-400">
          Questions? Email
          {' '}
          <a href={`mailto:${business.email}`} className="font-semibold text-ember">{business.email}</a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-walnut">Order Firewood</h1>
      <p className="mt-2 text-walnut-400">
        Hand-split, ready-to-burn bundles in
        {' '}
        {business.serviceArea}
        . No payment now — we&apos;ll confirm and arrange Venmo with you.
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

        {/* One-time vs subscription */}
        <div>
          <span className={labelClass}>What would you like?</span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[{ id: 'onetime', label: 'One-time order' }, { id: 'subscription', label: 'Subscription' }].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mode === m.id
                    ? 'border-ember bg-ember text-white'
                    : 'border-cream-300 bg-white text-walnut hover:border-ember'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* One-time: product cart */}
        {!isSubscription && (
          <>
            <div>
              <span className={labelClass}>Add items</span>
              <div className="mt-2 space-y-3">
                {products.map((p) => {
                  const count = qty[p.id] || 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                        count > 0 ? 'border-ember bg-cream-100' : 'border-cream-300 bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-walnut">
                          {p.name}
                          <span className="ml-2 font-extrabold text-ember">{`$${p.price}`}</span>
                        </p>
                        <p className="text-xs text-walnut-400">{p.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Remove one ${p.name}`}
                          onClick={() => setProductQty(p.id, count - 1)}
                          disabled={count === 0}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-300 text-walnut hover:border-ember disabled:opacity-40"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-walnut">{count}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${p.name}`}
                          onClick={() => setProductQty(p.id, count + 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-300 text-walnut hover:border-ember"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pickup or delivery */}
            <div>
              <span className={labelClass}>Pickup or delivery?</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {[
                  {
                    id: 'pickup', label: 'Pickup', note: 'Free', Icon: BuildingStorefrontIcon,
                  },
                  {
                    id: 'delivery', label: 'Delivery', note: `+ $${DELIVERY_FEE}`, Icon: TruckIcon,
                  },
                ].map(({
                  id, label, note, Icon,
                }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setFulfillment(id)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors ${
                      fulfillment === id
                        ? 'border-ember bg-cream-100 ring-2 ring-ember/30'
                        : 'border-cream-300 bg-white hover:border-ember'
                    }`}
                  >
                    <Icon className="h-6 w-6 text-ember" aria-hidden="true" />
                    <span className="text-sm font-bold text-walnut">{label}</span>
                    <span className="text-xs font-semibold text-walnut-300">{note}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Subscription: tier picker */}
        {isSubscription && (
          <div>
            <span className={labelClass}>Choose a plan (delivered monthly)</span>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {subscriptions.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSubPlan(s.plan)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors ${
                    subPlan === s.plan
                      ? 'border-ember bg-cream-100 ring-2 ring-ember/30'
                      : 'border-cream-300 bg-white hover:border-ember'
                  }`}
                >
                  <span className="text-sm font-bold text-walnut">{s.name}</span>
                  <span className="text-lg font-extrabold text-ember">{s.priceLabel}</span>
                  <span className="text-xs text-walnut-400">{s.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preferred date */}
        <div>
          <span className={labelClass}>
            {isSubscription ? 'First delivery date' : 'Pickup / delivery date'}
          </span>

          {rushEnabled && leadDays > 0 && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-cream-300 bg-cream-100 p-3">
              <input
                type="checkbox"
                checked={rushRequested}
                onChange={(e) => setRushRequested(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
              />
              <span className="text-sm text-walnut">
                <span className="font-semibold">In a pinch? Request a rush order.</span>
                {` Unlocks sooner dates for a ${rushPercent}% rush charge — subject to availability.`}
              </span>
            </label>
          )}

          {leadDays > 0 && (
            <p className="mt-2 text-xs font-semibold text-walnut">
              {`Please order at least ${leadDays} day${leadDays === 1 ? '' : 's'} ahead — the earliest date is ${formatDayLabel(earliest)}.`}
              {rushEnabled ? ' Need it sooner? Request a rush order above.' : ''}
            </p>
          )}
          <div className="mt-2">
            <MonthCalendar getDayState={getDayState} onSelectDate={setPreferredDate} />
          </div>
          <p className="mt-1 text-xs text-walnut-300">
            {preferredDate
              ? `Selected: ${formatDayLabel(preferredDate)}${isRush ? ' · rush order' : ''}. Greyed dates are unavailable.`
              : 'Pick a date, then choose a time window below. Greyed dates are unavailable.'}
          </p>
        </div>

        {/* Time windows */}
        <div>
          <span className={labelClass}>Pickup / delivery windows</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIME_WINDOWS.map((w) => {
              const active = windowFroms.includes(w.from);
              const open = availableFroms.has(w.from);
              return (
                <button
                  type="button"
                  key={w.from}
                  onClick={() => toggleWindow(w.from)}
                  disabled={!open}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    // eslint-disable-next-line no-nested-ternary
                    !open
                      ? 'cursor-not-allowed border-cream-300 bg-cream-100 text-walnut-200'
                      : active
                        ? 'border-ember bg-ember text-white'
                        : 'border-cream-300 bg-white text-walnut hover:border-ember'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-walnut-300">
            {!preferredDate
              ? 'Choose a date above to see available times.'
              : 'Pick one or more times that work — we’ll fulfill within one of them.'}
          </p>
        </div>

        {/* Pickup info or delivery address */}
        {isPickup ? (
          <div className="rounded-md bg-cream-300/50 p-4">
            <p className="text-base font-bold text-walnut">Curb pickup</p>
            <p className="mt-1 text-sm text-walnut-400">
              {pickupInstructions || 'We’ll set your bundles out for your window — grab them anytime within it.'}
            </p>
          </div>
        ) : (
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
              <label htmlFor="neighborhood" className={labelClass}>Neighborhood (optional)</label>
              <select id="neighborhood" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} className={`mt-2 ${inputClass}`}>
                <option value="">Select…</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className={labelClass}>Delivery notes (optional)</label>
              <textarea id="notes" rows={2} value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} className={`mt-2 ${inputClass}`} />
            </div>
          </fieldset>
        )}

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

        {/* Promo / referral code (one-time only) */}
        {!isSubscription && (
          <div>
            <label htmlFor="promo" className={labelClass}>Promo or referral code (optional)</label>
            <div className="mt-2 flex gap-2">
              <input
                id="promo"
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter code"
                className={inputClass}
              />
              {appliedCode ? (
                <button type="button" onClick={removeCode} className="shrink-0 rounded-xl border border-cream-300 px-4 py-3 text-sm font-semibold text-walnut hover:border-ember">
                  Remove
                </button>
              ) : (
                <button type="button" onClick={applyCode} className="shrink-0 rounded-xl bg-walnut px-5 py-3 text-sm font-semibold text-white hover:bg-walnut-400">
                  Apply
                </button>
              )}
            </div>
            {codeError && <p className="mt-1 text-xs text-red-600">{codeError}</p>}
            {appliedCode && discountInfo && (
              <p className="mt-1 text-xs font-semibold text-green-700">{`Applied ${appliedCode} — ${discountInfo.label}.`}</p>
            )}
          </div>
        )}

        {/* Estimate */}
        <div className="rounded-xl border border-cream-300 bg-cream-100 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-walnut">
              {isSubscription ? 'Monthly price' : 'Estimated total'}
            </span>
            <span className="text-2xl font-extrabold text-ember">
              {isSubscription ? (selectedSub?.priceLabel || '—') : `$${finalTotalNum}`}
            </span>
          </div>
          {!isSubscription && (
            <div className="mt-2 space-y-0.5 text-sm text-walnut-400">
              {cart.map((c) => (
                <p key={c.id} className="flex justify-between">
                  <span>{`${c.count}× ${c.name}`}</span>
                  <span>{`$${c.price * c.count}`}</span>
                </p>
              ))}
              {cart.length === 0 && <p>Add items above to see your total.</p>}
              {deliveryFee > 0 && (
                <p className="flex justify-between">
                  <span>Delivery</span>
                  <span>{`$${deliveryFee}`}</span>
                </p>
              )}
              {rushSurcharge > 0 && (
                <p className="flex justify-between font-semibold text-amber-700">
                  <span>{`Rush +${rushPercent}%`}</span>
                  <span>{`$${rushSurcharge}`}</span>
                </p>
              )}
              {discount > 0 && (
                <p className="flex justify-between font-semibold text-green-700">
                  <span>{`Promo ${appliedCode}`}</span>
                  <span>{`−$${discount}`}</span>
                </p>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-walnut-300">
            Estimate only — no payment now. We&apos;ll confirm the final total with you.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-ember px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}

export default Order;
