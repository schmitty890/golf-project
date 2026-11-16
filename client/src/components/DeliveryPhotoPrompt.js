/* eslint-disable no-underscore-dangle */
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { MAX_DELIVERY_PHOTOS, uploadDeliveryPhotos } from '../utils/deliveryPhotos';

// Shown right after the owner marks an order Delivered: snap or pick photos of the drop-off.
// They're saved to the order and appear on the admin Delivery map. Skipping is always fine.
function DeliveryPhotoPrompt({ order, token, onClose }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const pick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    setError('');
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_DELIVERY_PHOTOS));
  };

  const save = async () => {
    if (!files.length) return;
    setSaving(true);
    setError('');
    try {
      const ids = await uploadDeliveryPhotos(order._id, files, token, (n, total) => {
        setProgress(`Saved ${n} of ${total}…`);
      });
      setDone(ids.length);
      setFiles([]);
    } catch (err) {
      const saved = err.uploadedIds?.length || 0;
      setFiles((prev) => prev.slice(saved));
      setDone((d) => d + saved);
      setError(err.message);
    } finally {
      setSaving(false);
      setProgress('');
    }
  };

  const address = [order.deliveryAddress?.street, order.deliveryAddress?.unit].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="delivered-title">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <p className="text-xs font-bold uppercase tracking-wide text-green-700">✓ Marked delivered</p>
        <h2 id="delivered-title" className="mt-1 text-lg font-extrabold text-walnut">
          {done ? 'Photos saved' : 'Add a photo of the drop-off?'}
        </h2>
        <p className="mt-0.5 text-sm text-walnut-400">
          {[order.contact?.name, address].filter(Boolean).join(' · ')}
        </p>

        {done > 0 && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            {`${done} photo${done === 1 ? '' : 's'} added to this delivery on the Delivery map.`}
          </p>
        )}

        {previews.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                <img src={src} alt={`Drop-off ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                {!saving && (
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-sm font-bold text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />

        <div className="mt-5 flex flex-col gap-2">
          {files.length > 0 ? (
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white hover:bg-ember-600 disabled:opacity-60">
              {saving ? (progress || 'Saving…') : `Save ${files.length} photo${files.length === 1 ? '' : 's'}`}
            </button>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white hover:bg-ember-600">
              {done ? '📷 Add more photos' : '📷 Take or choose photos'}
            </button>
          )}
          {files.length > 0 && files.length < MAX_DELIVERY_PHOTOS && !saving && (
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-cream-300 px-4 py-2.5 text-sm font-semibold text-walnut hover:border-ember">
              Add another
            </button>
          )}
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-walnut-400 hover:text-walnut">
            {done ? 'Done' : 'Skip for now'}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-walnut-300">
          You can add photos later from the
          {' '}
          <Link to="/admin/deliveries" onClick={onClose} className="font-semibold text-ember hover:text-ember-600">Delivery map</Link>
          .
        </p>
      </div>
    </div>
  );
}

DeliveryPhotoPrompt.propTypes = {
  order: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    contact: PropTypes.shape({ name: PropTypes.string }),
    deliveryAddress: PropTypes.shape({ street: PropTypes.string, unit: PropTypes.string }),
  }).isRequired,
  token: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DeliveryPhotoPrompt;
