/* eslint-disable no-underscore-dangle, jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { TrashIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';
import StarRating from '../../components/StarRating';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const FILTERS = ['all', 'pending', 'approved', 'rejected'];
const statusClasses = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-200 text-gray-700',
};

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-walnut focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

function AdminFeedback() {
  const { token } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter !== 'all' ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/api/feedback${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const patch = async (id, body) => {
    try {
      const res = await axios.patch(`${API_URL}/api/feedback/${id}`, body, authHeaders);
      setItems((prev) => prev.map((it) => (it._id === id ? { ...it, ...res.data } : it)));
      setError('');
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update feedback');
      return false;
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/feedback/${id}`, authHeaders);
      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete feedback');
    }
  };

  const startEdit = (it) => {
    setEditingId(it._id);
    setDraft({
      rating: it.rating, comment: it.comment, name: it.name, location: it.location || '',
    });
  };

  const saveEdit = async (id) => {
    const ok = await patch(id, draft);
    if (ok) setEditingId(null);
  };

  // When status filtering, a status change may move the item out of view — refetch then.
  const setStatus = async (id, status) => {
    const ok = await patch(id, { status });
    if (ok && filter !== 'all') fetchItems();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-walnut">Feedback</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="fb-filter" className="text-sm font-semibold text-walnut">Status</label>
          <select
            id="fb-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-cream-300 bg-white px-3 py-1.5 text-sm capitalize text-walnut focus:outline-ember"
          >
            {FILTERS.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
          </select>
        </div>
      </div>

      {loading && <p className="mt-8 text-walnut-400">Loading…</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {!loading && items.length === 0 && (
        <p className="mt-12 text-center text-walnut-400">No feedback found.</p>
      )}

      <ul className="mt-8 space-y-4">
        {items.map((it) => {
          const editing = editingId === it._id;
          return (
            <li key={it._id} className="rounded-lg border border-cream-300 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <StarRating
                      value={draft.rating}
                      onChange={(n) => setDraft((d) => ({ ...d, rating: n }))}
                      size="md"
                    />
                  ) : (
                    <StarRating value={it.rating} size="sm" />
                  )}

                  {editing ? (
                    <textarea
                      rows={2}
                      value={draft.comment}
                      onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
                      className={`mt-2 ${inputClass}`}
                    />
                  ) : (
                    <p className="mt-2 text-sm text-walnut-400">{it.comment || <span className="italic">No comment</span>}</p>
                  )}

                  {editing ? (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Name"
                        className={inputClass}
                      />
                      <input
                        value={draft.location}
                        onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                        placeholder="Neighborhood"
                        className={inputClass}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-walnut">
                      {it.name}
                      {it.location && <span className="font-normal text-walnut-300">{` · ${it.location}`}</span>}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-walnut-300">
                    {it.user ? `Account: ${it.user.email}` : 'Guest'}
                    {' · '}
                    {new Date(it.createdAt).toLocaleString()}
                  </p>
                </div>

                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[it.status] || ''}`}>
                  {it.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {editing ? (
                  <>
                    <button type="button" onClick={() => saveEdit(it._id)} className="rounded-lg bg-ember px-4 py-1.5 text-sm font-semibold text-white hover:bg-ember-600">Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-walnut-400 hover:text-walnut">Cancel</button>
                  </>
                ) : (
                  <>
                    {it.status !== 'approved' && (
                      <button type="button" onClick={() => setStatus(it._id, 'approved')} className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700">Approve</button>
                    )}
                    {it.status !== 'rejected' && (
                      <button type="button" onClick={() => setStatus(it._id, 'rejected')} className="rounded-lg border border-cream-300 px-4 py-1.5 text-sm font-semibold text-walnut hover:border-ember">Reject</button>
                    )}
                    {it.status === 'rejected' && (
                      <button type="button" onClick={() => setStatus(it._id, 'pending')} className="rounded-lg border border-cream-300 px-4 py-1.5 text-sm font-semibold text-walnut hover:border-ember">Reset to pending</button>
                    )}
                    <button type="button" onClick={() => startEdit(it)} className="rounded-lg border border-cream-300 px-4 py-1.5 text-sm font-semibold text-walnut hover:border-ember">Edit</button>
                    <button type="button" onClick={() => remove(it._id)} className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50" aria-label="Delete">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AdminFeedback;
