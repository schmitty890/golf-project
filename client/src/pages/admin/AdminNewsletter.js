/* eslint-disable jsx-a11y/label-has-associated-control, no-underscore-dangle */
import {
  useState, useEffect, useContext, useCallback,
} from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const inputClass = 'w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-walnut focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';
const cardClass = 'mt-6 rounded-xl border border-cream-300 bg-white p-5';

// Seasonal starting points — pick one, then edit freely before sending (blank fields = free-form).
const TEMPLATES = [
  {
    name: 'Fall firepit kickoff',
    subject: 'Fall firepit season is here 🔥',
    heading: 'Cozy nights are back',
    body: 'Hey neighbor!\n\nThe evenings are finally cooling off — perfect for a backyard fire. '
      + 'We\'ve got fresh, seasoned red & white oak stocked and ready to deliver right to your door.\n\n'
      + 'Order anytime at volwfirewood.com. See you around the fire!',
  },
  {
    name: 'Winter cold-snap restock',
    subject: 'Cold snap coming — stock up on firewood',
    heading: 'Stay warm this week',
    body: 'Hey neighbor!\n\nThere\'s a cold stretch in the forecast. Now\'s a great time to top off '
      + 'your firewood so you\'re ready for those chilly nights.\n\n'
      + 'Seasoned and split, delivered to your driveway or doorway. Order at volwfirewood.com.',
  },
  {
    name: 'Spring / summer lake nights',
    subject: 'Backyard fire season by the lake ☀️🔥',
    heading: 'Long evenings, good fires',
    body: 'Hey neighbor!\n\nWarm nights by the lake call for a fire and some s\'mores. '
      + 'We keep clean, seasoned firewood in stock all season — no hauling from the store.\n\n'
      + 'Order in a minute at volwfirewood.com and we\'ll bring it right to you.',
  },
];

function AdminNewsletter() {
  const { token } = useContext(AuthContext);
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [subscriberCount, setSubscriberCount] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [subject, setSubject] = useState('');
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [templateIdx, setTemplateIdx] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const load = useCallback(async () => {
    try {
      const [countRes, campRes] = await Promise.all([
        axios.get(`${API_URL}/api/newsletter/subscribers/count`, authHeaders),
        axios.get(`${API_URL}/api/newsletter/campaigns`, authHeaders),
      ]);
      setSubscriberCount(countRes.data.count ?? 0);
      setCampaigns(campRes.data.campaigns || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load newsletter data');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const applyTemplate = (idx) => {
    setTemplateIdx(idx);
    const t = TEMPLATES[Number(idx)];
    if (t) {
      setSubject(t.subject);
      setHeading(t.heading);
      setBody(t.body);
    }
  };

  const sendBatch = async (campaignId) => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/newsletter/campaigns/${campaignId}/send-batch`, {}, authHeaders);
      const {
        sentThisBatch, failedThisBatch, remaining, status,
      } = res.data;
      const failNote = failedThisBatch ? ` · ${failedThisBatch} failed` : '';
      const tail = (status === 'done' || remaining <= 0)
        ? 'All done — everyone has been emailed. 🎉'
        : `${remaining} left — run the next batch tomorrow (Gmail limits ~500/day).`;
      setResult(`Sent ${sentThisBatch}${failNote}. ${tail}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send batch');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please add a subject and a message first.');
      return;
    }
    setBusy(true);
    setError('');
    setResult('');
    try {
      const res = await axios.post(`${API_URL}/api/newsletter/test`, { subject, heading, body }, authHeaders);
      setResult(`Test sent to ${res.data.to} — check your inbox.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send test');
    } finally {
      setBusy(false);
    }
  };

  const createAndSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please add a subject and a message.');
      return;
    }
    const n = subscriberCount ?? 0;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Send this newsletter to your ${n} subscriber(s)? Up to 400 go out now.`)) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const res = await axios.post(`${API_URL}/api/newsletter/campaigns`, { subject, heading, body }, authHeaders);
      const campaignId = res.data.campaign?._id;
      setSubject('');
      setHeading('');
      setBody('');
      setTemplateIdx('');
      if (campaignId) await sendBatch(campaignId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign');
      setBusy(false);
    }
  };

  const active = campaigns.find((c) => c.status === 'sending');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-walnut">Newsletter</h1>
      <p className="mt-1 text-sm text-walnut-400">
        Write an update and email it to your subscribers. Large lists go out in daily batches to
        stay within Gmail&apos;s send limit. Every email includes an unsubscribe link.
      </p>

      <p className="mt-3 text-sm font-semibold text-walnut">
        {subscriberCount === null ? 'Loading…' : `${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'}`}
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}
      {result && <p className="mt-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-800">{result}</p>}

      {/* Resume an in-progress campaign */}
      {active && (
        <div className={cardClass}>
          <h2 className="text-base font-bold text-walnut">Campaign in progress</h2>
          <p className="mt-1 text-sm text-walnut">{active.subject}</p>
          <p className="mt-1 text-xs text-walnut-400">
            {`Sent ${active.sentCount || 0} so far${active.failedCount ? ` · ${active.failedCount} failed` : ''}. `}
            Gmail limits ~500/day — send the next batch tomorrow if any remain.
          </p>
          <button
            type="button"
            onClick={() => sendBatch(active._id)}
            disabled={busy}
            className="mt-4 rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send next batch (up to 400)'}
          </button>
        </div>
      )}

      {/* Compose a new one (hidden while a campaign is mid-send to avoid overlap) */}
      {!active && (
        <div className={cardClass}>
          <h2 className="text-base font-bold text-walnut">Compose</h2>

          <label htmlFor="nl-template" className="mt-4 block text-xs font-semibold text-walnut">Start from a template (optional)</label>
          <select id="nl-template" value={templateIdx} onChange={(e) => applyTemplate(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">— Blank (write your own) —</option>
            {TEMPLATES.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}
          </select>

          <label htmlFor="nl-subject" className="mt-4 block text-xs font-semibold text-walnut">Subject</label>
          <input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Fall firepit season is here 🔥" className={`mt-1 ${inputClass}`} />

          <label htmlFor="nl-heading" className="mt-4 block text-xs font-semibold text-walnut">Heading (optional)</label>
          <input id="nl-heading" value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Shown at the top of the email" className={`mt-1 ${inputClass}`} />

          <label htmlFor="nl-body" className="mt-4 block text-xs font-semibold text-walnut">Message</label>
          <textarea id="nl-body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your update… (blank lines start new paragraphs)" className={`mt-1 ${inputClass}`} />
          <p className="mt-1 text-xs text-walnut-300">
            Sent from your branded template with an unsubscribe link added automatically.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sendTest}
              disabled={busy}
              className="rounded-lg border border-ember px-5 py-2 text-sm font-semibold text-ember transition-colors hover:bg-ember hover:text-white disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Send test to myself'}
            </button>
            <button
              type="button"
              onClick={createAndSend}
              disabled={busy || !subscriberCount}
              className="rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              {busy ? 'Sending…' : `Send to ${subscriberCount ?? 0} subscriber${subscriberCount === 1 ? '' : 's'}`}
            </button>
          </div>
          {!subscriberCount ? (
            <p className="mt-2 text-xs text-walnut-400">No subscribers yet — nothing to send.</p>
          ) : null}
        </div>
      )}

      {/* History */}
      {campaigns.length > 0 && (
        <div className={cardClass}>
          <h2 className="text-base font-bold text-walnut">Recent sends</h2>
          <ul className="mt-3 divide-y divide-cream-300">
            {campaigns.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-walnut">{c.subject}</span>
                <span className="shrink-0 text-xs text-walnut-400">
                  {`${c.sentCount || 0} sent · ${c.status === 'done' ? 'done' : 'in progress'}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AdminNewsletter;
