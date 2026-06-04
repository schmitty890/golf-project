/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';
import StarRating from './StarRating';
import neighborhoods from '../data/neighborhoods';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

// Leave-feedback modal. Anyone can submit; logged-in users get their name prefilled.
function FeedbackModal({ open, onClose }) {
  const { user, token } = useContext(AuthContext);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Prefill the name from the logged-in account each time the modal opens.
  useEffect(() => {
    if (open && user) {
      setName((prev) => prev || [user.firstName, user.lastName].filter(Boolean).join(' '));
    }
  }, [open, user]);

  if (!open) return null;

  const close = () => {
    // Reset transient state so a reopen is clean.
    setError('');
    setDone(false);
    setRating(0);
    setComment('');
    setLocation('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (rating < 1) {
      setError('Please choose a star rating.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API_URL}/api/feedback`, {
        rating, comment, name, location,
      }, { headers });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-walnut/60 transition-opacity"
          onClick={close}
          onKeyDown={(ev) => ev.key === 'Escape' && close()}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
        <div className="relative w-full transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all sm:my-8 sm:max-w-lg">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircleIcon className="mx-auto h-14 w-14 text-ember" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-extrabold text-walnut">Thanks for your feedback!</h3>
              <p className="mt-2 text-sm text-walnut-400">
                Your review will appear once we&apos;ve had a chance to approve it.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-6 rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-600"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 className="text-xl font-extrabold text-walnut">Leave feedback</h3>
              <p className="mt-1 text-sm text-walnut-400">Tell your neighbors what you thought.</p>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
              )}

              <div className="mt-4">
                <span className="block text-sm font-semibold text-walnut">Your rating</span>
                <StarRating value={rating} onChange={setRating} size="lg" className="mt-2" />
              </div>

              <div className="mt-4">
                <label htmlFor="fb-comment" className="block text-sm font-semibold text-walnut">Comment</label>
                <textarea
                  id="fb-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you like? Anything we can improve?"
                  className={`mt-2 ${inputClass}`}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fb-name" className="block text-sm font-semibold text-walnut">Name</label>
                  <input id="fb-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={`mt-2 ${inputClass}`} />
                </div>
                <div>
                  <label htmlFor="fb-location" className="block text-sm font-semibold text-walnut">Neighborhood (optional)</label>
                  <select id="fb-location" value={location} onChange={(e) => setLocation(e.target.value)} className={`mt-2 ${inputClass}`}>
                    <option value="">Select…</option>
                    {neighborhoods.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit feedback'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-cream-300 px-4 py-3 text-base font-semibold text-walnut hover:border-ember"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

FeedbackModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FeedbackModal;
