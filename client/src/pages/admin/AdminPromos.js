/* eslint-disable no-underscore-dangle, jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { TrashIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const inputClass = 'rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-walnut focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

const blankForm = {
  code: '', discountType: 'amount', discountValue: '', maxUses: '', expiresAt: '', description: '',
};

function AdminPromos() {
  const { token } = useContext(AuthContext);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [referral, setReferral] = useState({ enabled: true, type: 'amount', value: 5 });
  const [refSaved, setRefSaved] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/promos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCodes(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCodes();
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => { if (res.data.referralDiscount) setReferral(res.data.referralDiscount); })
      .catch(() => {});
  }, [fetchCodes]);

  const saveReferral = async () => {
    try {
      await axios.put(`${API_URL}/api/settings/availability`, {
        referralDiscount: {
          enabled: referral.enabled,
          type: referral.type,
          value: Number(referral.value) || 0,
        },
      }, authHeaders);
      setRefSaved(true);
      setTimeout(() => setRefSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save referral discount');
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/promos`, {
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : 0,
        expiresAt: form.expiresAt || null,
        description: form.description,
      }, authHeaders);
      setCodes((prev) => [res.data, ...prev]);
      setForm(blankForm);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create code');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    try {
      const res = await axios.patch(`${API_URL}/api/promos/${c._id}`, { active: !c.active }, authHeaders);
      setCodes((prev) => prev.map((x) => (x._id === c._id ? res.data : x)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update code');
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/promos/${id}`, authHeaders);
      setCodes((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete code');
    }
  };

  const fmtDiscount = (c) => (c.discountType === 'percent' ? `${c.discountValue}% off` : `$${c.discountValue} off`);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-walnut">Promo codes</h1>
      <p className="mt-1 text-sm text-walnut-400">
        Discount codes customers enter at checkout. Discounts are recorded on the order — you honor
        the final total when you confirm payment.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {/* Referral discount config */}
      <div className="mt-6 rounded-xl border border-cream-300 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-walnut">Neighbor referral discount</h2>
          {refSaved && <span className="text-sm font-semibold text-green-700">Saved ✓</span>}
        </div>
        <p className="mt-1 text-xs text-walnut-400">
          What a referred neighbor gets off their first order. (You reward the referrer manually —
          orders show who referred them.)
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-walnut">
            <input
              type="checkbox"
              checked={referral.enabled}
              onChange={(e) => setReferral({ ...referral, enabled: e.target.checked })}
              className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
            />
            Offer referrals
          </label>
          <div>
            <label htmlFor="r-type" className="block text-xs font-semibold text-walnut">Type</label>
            <select id="r-type" value={referral.type} onChange={(e) => setReferral({ ...referral, type: e.target.value })} className={`mt-1 ${inputClass}`}>
              <option value="amount">$ off</option>
              <option value="percent">% off</option>
            </select>
          </div>
          <div>
            <label htmlFor="r-value" className="block text-xs font-semibold text-walnut">
              {referral.type === 'percent' ? 'Percent' : 'Amount ($)'}
            </label>
            <input id="r-value" type="number" min={0} value={referral.value} onChange={(e) => setReferral({ ...referral, value: e.target.value })} className={`mt-1 w-24 ${inputClass}`} />
          </div>
          <button type="button" onClick={saveReferral} className="rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600">
            Save
          </button>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={create} className="mt-6 rounded-xl border border-cream-300 bg-white p-5">
        <h2 className="text-base font-bold text-walnut">New code</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="p-code" className="block text-xs font-semibold text-walnut">Code</label>
            <input id="p-code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="NEIGHBOR5" className={`mt-1 w-full uppercase ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="p-type" className="block text-xs font-semibold text-walnut">Type</label>
            <select id="p-type" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className={`mt-1 w-full ${inputClass}`}>
              <option value="amount">$ off</option>
              <option value="percent">% off</option>
            </select>
          </div>
          <div>
            <label htmlFor="p-value" className="block text-xs font-semibold text-walnut">
              {form.discountType === 'percent' ? 'Percent' : 'Amount ($)'}
            </label>
            <input id="p-value" type="number" min={0} required value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className={`mt-1 w-full ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="p-max" className="block text-xs font-semibold text-walnut">Max uses (0 = ∞)</label>
            <input id="p-max" type="number" min={0} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className={`mt-1 w-full ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="p-exp" className="block text-xs font-semibold text-walnut">Expires (optional)</label>
            <input id="p-exp" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={`mt-1 w-full ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="p-desc" className="block text-xs font-semibold text-walnut">Note (optional)</label>
            <input id="p-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Launch offer" className={`mt-1 w-full ${inputClass}`} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50">
          {saving ? 'Adding…' : 'Add code'}
        </button>
      </form>

      {loading && <p className="mt-8 text-walnut-400">Loading…</p>}
      {!loading && codes.length === 0 && (
        <p className="mt-12 text-center text-walnut-400">No promo codes yet.</p>
      )}

      <ul className="mt-6 space-y-3">
        {codes.map((c) => {
          const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
          const maxed = c.maxUses > 0 && c.uses >= c.maxUses;
          return (
            <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cream-300 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="font-bold text-walnut">
                  {c.code}
                  <span className="ml-2 text-sm font-semibold text-ember">{fmtDiscount(c)}</span>
                  {!c.active && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">inactive</span>}
                  {expired && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">expired</span>}
                  {maxed && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">max uses</span>}
                </p>
                <p className="mt-1 text-xs text-walnut-300">
                  {`Used ${c.uses}${c.maxUses ? ` / ${c.maxUses}` : ''}`}
                  {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ''}
                  {c.description ? ` · ${c.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => toggleActive(c)} className="rounded-lg border border-cream-300 px-3 py-1.5 text-sm font-semibold text-walnut hover:border-ember">
                  {c.active ? 'Disable' : 'Enable'}
                </button>
                <button type="button" onClick={() => remove(c._id)} className="rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50" aria-label="Delete">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AdminPromos;
