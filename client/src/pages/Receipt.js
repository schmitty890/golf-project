import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import business from '../data/business';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => (d
  ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : '');

const methodLabel = (m) => {
  if (m === 'card') return 'Card';
  if (m === 'venmo') return 'Venmo';
  return '';
};

// Standalone, print-friendly receipt for a single order. Reached by the order's unguessable
// trackingToken (same privacy model as /track/:token), so both the owner and the customer can print
// it. "Save as PDF" is just the browser's print dialog — no PDF library needed.
function Receipt() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    axios.get(`${API_URL}/api/orders/track/${token}`)
      .then((res) => { setOrder(res.data); setState('ready'); })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-walnut-400">Loading receipt…</div>;
  }
  if (state === 'error' || !order) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-walnut-400">Receipt not found.</div>;
  }

  const isSub = order.orderType === 'subscription';
  const lines = isSub
    ? [{ label: `${order.subscriptionBundles} bundles / month subscription`, amount: order.total }]
    : (order.items || []).map((i) => ({
      label: `${i.quantity}× ${i.name}`,
      amount: (i.quantity || 0) * (i.unitPrice || 0),
    }));
  const paid = order.paymentStatus === 'paid';
  const method = methodLabel(order.paymentMethod);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-cream-300 bg-white p-6 text-walnut shadow-sm">
        <div className="flex items-baseline justify-between border-b border-cream-300 pb-3">
          <div>
            <h1 className="text-xl font-extrabold text-ember">{business.name}</h1>
            <p className="text-xs text-walnut-400">{business.email}</p>
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-walnut-400">Receipt</p>
        </div>

        <div className="mt-3 flex justify-between text-sm text-walnut-400">
          <span>{`Order #${String(token).slice(0, 6).toUpperCase()}`}</span>
          <span>{fmtDate(order.createdAt)}</span>
        </div>
        {order.customerName && (
          <p className="mt-1 text-sm text-walnut-400">{`Billed to: ${order.customerName}`}</p>
        )}

        <table className="mt-4 w-full text-sm">
          <tbody>
            {lines.map((l) => (
              <tr key={l.label}>
                <td className="py-1 pr-2">{l.label}</td>
                <td className="py-1 text-right font-semibold">{money(l.amount)}</td>
              </tr>
            ))}
            <tr className="text-walnut-400">
              <td className="py-1 pr-2">Delivery</td>
              <td className="py-1 text-right">Free</td>
            </tr>
            {order.discount > 0 && (
              <tr className="text-green-700">
                <td className="py-1 pr-2">Discount</td>
                <td className="py-1 text-right">{`−${money(order.discount)}`}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex justify-between border-t border-cream-300 pt-3 text-base font-bold">
          <span>{isSub ? 'Monthly total' : 'Total'}</span>
          <span>{money(order.total)}</span>
        </div>

        <p className="mt-3 text-sm">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {paid ? 'Paid' : 'Unpaid'}
            {method ? ` · ${method}` : ''}
          </span>
        </p>

        <p className="mt-4 text-center text-xs text-walnut-300">
          Thank you for supporting a local neighbor! 🔥
        </p>
      </div>

      <div className="mt-5 text-center print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-600"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}

export default Receipt;
