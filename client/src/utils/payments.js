import axios from 'axios';
import business from '../data/business';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Venmo deep link with the amount + a note pre-filled ('' if no handle is configured).
export function venmoPayUrl(handle, amount) {
  const h = (handle || '').replace(/^@/, '');
  if (!h) return '';
  const note = encodeURIComponent(`${business.name} firewood order`);
  return `https://venmo.com/${h}?txn=pay${amount ? `&amount=${amount}` : ''}&note=${note}`;
}

// The customer-facing "pay this order" page (tracking page: card + Venmo buttons).
export function orderPayPageUrl(trackingToken) {
  return `${window.location.origin}/track/${trackingToken}`;
}

// Start a fresh Stripe Checkout for an existing unpaid order. Resolves to the Checkout URL;
// rejects with a customer-friendly message.
export async function startCardCheckout(trackingToken) {
  try {
    const res = await axios.post(`${API_URL}/api/orders/track/${trackingToken}/checkout`);
    if (!res.data?.url) throw new Error('missing url');
    return res.data.url;
  } catch (err) {
    throw new Error(err.response?.data?.error || 'Couldn’t start card checkout — please pay with Venmo instead.');
  }
}

// Fetch an order's public payment info (amount, status, Venmo handle, whether card is offered).
// Also self-heals a card payment server-side if Stripe's webhook was slow.
export async function fetchOrderPayment(trackingToken) {
  const res = await axios.get(`${API_URL}/api/orders/track/${trackingToken}`);
  return res.data;
}
