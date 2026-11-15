import {
  useEffect, useState, useCallback, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import {
  XMarkIcon, CreditCardIcon, ShareIcon, ChatBubbleLeftIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { fetchOrderPayment, orderPayPageUrl, startCardCheckout } from '../utils/payments';

// Full-screen "collect payment at the door" panel for the owner's phone (run sheet).
// Shows a QR code to the order's pay page (card + Venmo), share/text links, and a "pay by card on
// my phone" option. Polls the order so it flips to "Paid" the moment a card payment confirms.
function CollectPaymentPanel({ order, onClose, onPaid }) {
  const token = order.trackingToken;
  const payUrl = orderPayPageUrl(token);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [startingCard, setStartingCard] = useState(false);
  const paid = info?.paymentStatus === 'paid';
  // Report "paid" to the run sheet once (it re-renders with fresh props, which mustn't re-fire).
  const reported = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const orderId = order._id; // eslint-disable-line no-underscore-dangle

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOrderPayment(token);
      setInfo(data);
      if (data.paymentStatus === 'paid' && !reported.current) {
        reported.current = true;
        onPaidRef.current(orderId);
      }
    } catch {
      /* keep the last known state; the next poll retries */
    }
  }, [token, orderId]);

  useEffect(() => {
    refresh();
    if (paid) return undefined;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh, paid]);

  const amount = info?.total ?? '';
  const firstName = (order.contact?.name || '').split(' ')[0];
  const message = `Hi${firstName ? ` ${firstName}` : ''}! Here's the link to pay for your VOLW Firewood order${amount ? ` ($${amount})` : ''} — card or Venmo: ${payUrl}`;

  const share = async () => {
    setNote('');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'VOLW Firewood payment', text: message, url: payUrl });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setNote('Pay link copied — paste it into a text or email.');
    } catch {
      setNote(payUrl);
    }
  };

  // Open Stripe Checkout in a new tab so the run sheet stays put. The tab is opened synchronously
  // on tap (so it isn't popup-blocked), then pointed at Checkout once the session is ready.
  const cardOnMyPhone = async () => {
    setError('');
    setStartingCard(true);
    const tab = window.open('', '_blank');
    try {
      const url = await startCardCheckout(token);
      if (tab) tab.location = url;
      else window.location = url;
    } catch (err) {
      if (tab) tab.close();
      setError(err.message);
    } finally {
      setStartingCard(false);
    }
  };

  const phone = (order.contact?.phone || '').replace(/[^\d+]/g, '');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-cream" role="dialog" aria-modal="true" aria-label="Collect payment">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ember">Collect payment</p>
            <h2 className="text-xl font-extrabold text-walnut">{order.contact?.name || 'Customer'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-walnut hover:bg-cream-300" aria-label="Close">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        {paid ? (
          <div className="mt-16 text-center">
            <CheckCircleIcon className="mx-auto h-24 w-24 text-green-600" aria-hidden="true" />
            <p className="mt-4 text-3xl font-extrabold text-green-700">Paid ✓</p>
            <p className="mt-2 text-walnut-400">
              {`${amount ? `$${amount} received. ` : ''}Thanks — you're all set.`}
            </p>
            <button type="button" onClick={onClose} className="mt-8 rounded-xl bg-ember px-6 py-3 font-semibold text-white">Done</button>
          </div>
        ) : (
          <>
            <p className="mt-4 text-center text-4xl font-extrabold text-walnut">{amount ? `$${amount}` : '…'}</p>
            <p className="mt-1 text-center text-sm text-walnut-400">Scan with your phone camera to pay by card or Venmo</p>

            <div className="mx-auto mt-5 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-walnut/10">
              <QRCodeSVG value={payUrl} size={240} level="M" marginSize={1} />
            </div>

            <div className="mt-6 space-y-3">
              {info?.cardEnabled !== false && (
                <button
                  type="button"
                  onClick={cardOnMyPhone}
                  disabled={startingCard}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white hover:bg-ember-600 disabled:opacity-60"
                >
                  <CreditCardIcon className="h-5 w-5" aria-hidden="true" />
                  {startingCard ? 'Opening checkout…' : 'Pay by card on my phone'}
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={share}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-3 py-3 text-sm font-semibold text-walnut hover:border-ember"
                >
                  <ShareIcon className="h-5 w-5" aria-hidden="true" />
                  Share link
                </button>
                <a
                  href={`sms:${phone}?&body=${encodeURIComponent(message)}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-3 py-3 text-sm font-semibold text-walnut hover:border-ember"
                >
                  <ChatBubbleLeftIcon className="h-5 w-5" aria-hidden="true" />
                  Text link
                </a>
              </div>
            </div>

            {note && <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 text-sm text-walnut">{note}</p>}
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

            <p className="mt-6 text-center text-xs text-walnut-400">
              Card payments update here automatically. Paid by Venmo? Check your Venmo app, then tap
              {' '}
              <span className="font-semibold">Mark paid</span>
              {' '}
              on the run sheet.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

CollectPaymentPanel.propTypes = {
  order: PropTypes.shape({
    _id: PropTypes.string,
    trackingToken: PropTypes.string,
    contact: PropTypes.shape({ name: PropTypes.string, phone: PropTypes.string }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onPaid: PropTypes.func.isRequired,
};

export default CollectPaymentPanel;
