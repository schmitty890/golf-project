/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { TruckIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../context/AuthContext';
import business from '../data/business';
import {
  bundles, getActivePacks, subscriptions, seasons, TIME_WINDOWS,
} from '../data/pricing';
import MonthCalendar from '../components/MonthCalendar';
import ReferralShare from '../components/ReferralShare';
import neighborhoods from '../data/neighborhoods';
import { todayStr, formatDayLabel, addDays } from '../utils/dates';

const activePacks = getActivePacks();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';
const labelClass = 'block text-sm font-semibold text-walnut';

// Common bundle counts offered as quick-pick buttons (filtered to the bundle's minimum).
const QUANTITY_PRESETS = [1, 2, 3, 4, 5, 6];

function Order() {
  const { user, token } = useContext(AuthContext);

  // Prefill from an "Order again" navigation (My Orders), sanitized against current data.
  const location = useLocation();
  const reorder = location.state?.reorder || null;
  const reorderType = (() => {
    const t = reorder?.orderType;
    if (!['bundle', 'pack', 'subscription'].includes(t)) return 'bundle';
    if (t === 'pack' && activePacks.length === 0) return 'bundle'; // pack out of season now
    return t;
  })();

  const [orderType, setOrderType] = useState(reorderType);
  const [bundleId, setBundleId] = useState(
    bundles.some((b) => b.id === reorder?.bundleId) ? reorder.bundleId : bundles[0].id,
  );
  const [quantity, setQuantity] = useState(reorder?.quantity > 0 ? reorder.quantity : 1);
  const [packId, setPackId] = useState(
    activePacks.some((p) => p.id === reorder?.packId) ? reorder.packId : (activePacks[0]?.id || ''),
  );
  const [subscriptionPlan, setSubscriptionPlan] = useState(
    subscriptions.some((s) => s.plan === reorder?.subscriptionPlan)
      ? reorder.subscriptionPlan : subscriptions[0].plan,
  );
  const [season, setSeason] = useState(
    seasons.some((s) => s.id === reorder?.season) ? reorder.season : seasons[0].id,
  );
  const [preferredDate, setPreferredDate] = useState('');
  const [windowFroms, setWindowFroms] = useState([]);
  // Admin date overrides: { 'YYYY-MM-DD': ['HH:MM', ...] }. Absent date = fully open;
  // [] = closed; subset = only those windows.
  const [dateOverrides, setDateOverrides] = useState({});
  // Scheduling rules from admin settings.
  const [leadDays, setLeadDays] = useState(1);
  const [rushEnabled, setRushEnabled] = useState(true);
  const [rushPercent, setRushPercent] = useState(25);
  // Customer opted into a rush ("in a pinch") order to unlock within-lead dates.
  const [rushRequested, setRushRequested] = useState(false);
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('');
  // Promo / referral code.
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

  const selectedBundle = bundles.find((b) => b.id === bundleId);
  const minQty = selectedBundle?.minQty || 1;
  // Pickup only applies to the pickup bundle; packs/subscriptions are always delivery.
  const isPickup = orderType === 'bundle' && selectedBundle?.fulfillment === 'pickup';

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

  // Load admin date availability + scheduling rules (public endpoint — guests order too).
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
      .catch(() => setDateOverrides({})); // fall back to "all open" on error
  }, []);

  const today = todayStr();
  // Earliest non-rush date given the required advance notice.
  const earliest = addDays(today, leadDays);
  const allFroms = TIME_WINDOWS.map((w) => w.from);
  // Open window `from` times for a date (all windows unless overridden).
  const windowsForDate = (date) => {
    const ov = dateOverrides[date];
    return Array.isArray(ov) ? ov : allFroms;
  };
  // Whether a date falls inside the advance-notice (rush-only) window.
  const isRushDate = (date) => date >= today && date < earliest;
  // A date is selectable if not closed, has a window, and is either past the lead
  // window or unlocked via a rush request.
  const dateIsOpen = (date) => date >= today
    && windowsForDate(date).length > 0
    && (date >= earliest || (rushEnabled && rushRequested));
  // This order is a rush if the chosen date is inside the lead window.
  const isRush = Boolean(preferredDate) && isRushDate(preferredDate);

  const availableFroms = new Set(preferredDate ? windowsForDate(preferredDate) : []);
  // The selected windows as {from,to} objects, in the canonical TIME_WINDOWS order.
  const selectedWindows = TIME_WINDOWS.filter((w) => windowFroms.includes(w.from));

  const toggleWindow = (from) => setWindowFroms((prev) => (
    prev.includes(from) ? prev.filter((f) => f !== from) : [...prev, from]
  ));

  // Day styling/selectability for the calendar.
  const getDayState = (date) => {
    if (date < today) return { disabled: true, tone: 'open' };
    const ov = dateOverrides[date];
    const closed = Array.isArray(ov) && ov.length === 0;
    const rushWindow = isRushDate(date);
    // Within the lead window: only selectable when a rush is requested.
    const disabled = closed || (rushWindow && !(rushEnabled && rushRequested));
    return {
      disabled,
      // eslint-disable-next-line no-nested-ternary
      tone: closed ? 'closed' : (rushWindow ? 'rush' : 'open'),
      selected: date === preferredDate,
    };
  };

  // Drop any chosen windows no longer available for the selected date.
  useEffect(() => {
    setWindowFroms((prev) => {
      const next = prev.filter((f) => availableFroms.has(f));
      return next.length === prev.length ? prev : next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredDate, dateOverrides]);

  // If the rush request is turned off while an in-window date is selected, clear it.
  useEffect(() => {
    if (!rushRequested && preferredDate && isRushDate(preferredDate)) setPreferredDate('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rushRequested, preferredDate, earliest]);

  // Live price estimate for the current selection (no payment is taken at order time).
  // For one-time orders, a rush request adds a `rushPercent` surcharge to the total.
  const estimate = (() => {
    const withRush = (subtotal, line) => {
      const surcharge = isRush ? Math.round(subtotal * (rushPercent / 100)) : 0;
      return {
        line,
        amount: `$${subtotal + surcharge}`,
        recurring: false,
        rushLine: surcharge ? `Rush +${rushPercent}%: $${surcharge}` : '',
      };
    };
    if (orderType === 'bundle') {
      const qty = Number(quantity) || 0;
      const subtotal = qty * (selectedBundle?.unitPrice || 0);
      return withRush(subtotal, `${qty} × ${selectedBundle?.name} ($${selectedBundle?.unitPrice} each)`);
    }
    if (orderType === 'pack') {
      const pack = activePacks.find((p) => p.id === packId);
      return pack && withRush(pack.unitPrice, `${pack.name} — ${pack.bundleCount} bundles`);
    }
    const sub = subscriptions.find((s) => s.plan === subscriptionPlan);
    return sub && {
      line: `${sub.name} subscription — ${sub.cadence}`,
      amount: sub.price,
      recurring: true,
      rushLine: '',
    };
  })();

  // Numeric subtotal for one-time orders (promo discounts don't apply to subscriptions).
  const subtotalNum = estimate && !estimate.recurring
    ? Number(String(estimate.amount).replace(/[^0-9.]/g, '')) || 0
    : 0;
  const discount = (!estimate?.recurring && discountInfo?.discount) || 0;
  const finalTotalNum = Math.max(0, subtotalNum - discount);

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

  // Keep the discount in sync if the subtotal changes after a code was applied.
  useEffect(() => {
    if (!appliedCode || estimate?.recurring) return undefined;
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
  }, [subtotalNum, appliedCode]);

  const buildPayload = () => {
    const fulfillment = isPickup ? 'pickup' : 'delivery';
    const base = {
      orderType,
      fulfillment,
      contact,
      deliveryAddress: isPickup ? {} : address,
      preferredDate,
      preferredTimes: selectedWindows.map((w) => ({ from: w.from, to: w.to })),
      rush: isRush,
      code: appliedCode,
      subtotal: subtotalNum,
    };
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

    if (!preferredDate || !dateIsOpen(preferredDate)) {
      setError('Please choose an available date.');
      return;
    }

    if (windowFroms.length === 0) {
      setError('Please choose at least one pickup/delivery time window.');
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
    const amountNum = estimate && !estimate.recurring ? String(finalTotalNum) : '';
    const venmoNote = `${business.name} firewood order`;
    const venmoUrl = handle
      ? `https://venmo.com/${handle}?txn=pay${amountNum ? `&amount=${amountNum}` : ''}&note=${encodeURIComponent(venmoNote)}`
      : '';
    const windowsLabel = selectedWindows.map((w) => w.label).join(', ');
    const addressLine = [address.street, address.unit, address.neighborhood].filter(Boolean).join(', ');
    const summaryRows = [
      ['Order', estimate?.line],
      ['When', `${formatDayLabel(preferredDate)}${windowsLabel ? ` · ${windowsLabel}` : ''}`],
      ['How', isPickup ? 'Curb pickup' : 'Delivery'],
      ...(!isPickup ? [['Address', addressLine]] : []),
      ...(isRush ? [['Rush', `Yes (+${rushPercent}%)`]] : []),
      ...(discount > 0 ? [['Promo', `${appliedCode} (−$${discount})`]] : []),
      [estimate?.recurring ? 'Price' : 'Estimated total', estimate?.recurring ? estimate?.amount : `$${finalTotalNum}`],
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
            No payment needed to hold your order — we&apos;ll confirm the final total with you.
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
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
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
          <div className="space-y-4">
            <div>
              <span className={labelClass}>Pickup or delivery?</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {bundles.map((b) => {
                  const Icon = b.fulfillment === 'pickup' ? BuildingStorefrontIcon : TruckIcon;
                  const selected = bundleId === b.id;
                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setBundleId(b.id)}
                      className={`flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-colors ${
                        selected
                          ? 'border-ember bg-cream-100 ring-2 ring-ember/30'
                          : 'border-cream-300 bg-white hover:border-ember'
                      }`}
                    >
                      <Icon className="h-6 w-6 text-ember" aria-hidden="true" />
                      <span className="text-sm font-bold text-walnut">{b.name}</span>
                      <span className="text-lg font-extrabold text-ember">
                        {b.price}
                        <span className="text-xs font-semibold text-walnut-300"> / bundle</span>
                      </span>
                      <span className="text-xs text-walnut-400">{b.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className={labelClass}>How many bundles?</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {QUANTITY_PRESETS.filter((n) => n >= minQty).map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setQuantity(n)}
                    className={`h-11 w-11 rounded-xl border text-sm font-semibold transition-colors ${
                      Number(quantity) === n
                        ? 'border-ember bg-ember text-white'
                        : 'border-cream-300 bg-white text-walnut hover:border-ember'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <div className="flex items-center gap-2 pl-1">
                  <label htmlFor="quantity" className="text-sm font-semibold text-walnut-300">Other</label>
                  <input
                    id="quantity"
                    type="number"
                    min={minQty}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-11 w-20 rounded-xl border border-cream-300 bg-white px-3 text-base text-walnut transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                  />
                </div>
              </div>
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

        {/* Preferred date */}
        <div>
          <span className={labelClass}>
            {orderType === 'subscription' ? 'First delivery date' : 'Pickup / delivery date'}
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
                {' '}
                Unlocks sooner dates for a
                {' '}
                {rushPercent}
                % rush charge — subject to our availability; we&apos;ll confirm we can make it.
              </span>
            </label>
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

        {/* Pickup / delivery windows (multi-select) */}
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
            <p className="text-base font-bold text-walnut">Pickup order</p>
            <p className="mt-1 text-sm text-walnut-400">
              No delivery address needed — we&apos;ll text you a pickup spot and time in
              {' '}
              {business.serviceArea}
              {' '}
              after you order.
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

        {/* Promo / referral code */}
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

        {/* Live price estimate */}
        {estimate && (
          <div className="rounded-xl border border-cream-300 bg-cream-100 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-walnut">
                {estimate.recurring ? 'Estimated price' : 'Estimated total'}
              </span>
              <span className="text-2xl font-extrabold text-ember">
                {estimate.recurring ? estimate.amount : `$${finalTotalNum}`}
              </span>
            </div>
            <p className="mt-1 text-sm text-walnut-400">{estimate.line}</p>
            {estimate.rushLine && (
              <p className="mt-1 text-sm font-semibold text-amber-700">{estimate.rushLine}</p>
            )}
            {discount > 0 && (
              <p className="mt-1 text-sm font-semibold text-green-700">{`Promo ${appliedCode}: −$${discount}`}</p>
            )}
            <p className="mt-2 text-xs text-walnut-300">
              Estimate only — no payment now. We&apos;ll confirm the final total with you.
            </p>
          </div>
        )}

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
