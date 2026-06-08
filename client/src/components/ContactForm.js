/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';
const labelClass = 'block text-sm font-semibold text-walnut';

function ContactForm() {
  const { user } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Prefill name/email from the logged-in account.
  useEffect(() => {
    if (user) {
      setName((prev) => prev || [user.firstName, user.lastName].filter(Boolean).join(' '));
      setEmail((prev) => prev || user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!message.trim()) { setError('Please enter a message.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/contact`, {
        name, email, phone, message, company,
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-cream-300 bg-white p-8 text-center shadow-sm">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
        <h3 className="mt-3 text-lg font-bold text-walnut">Thanks — message sent!</h3>
        <p className="mt-1 text-sm text-walnut-400">We&apos;ll get back to you as soon as we can.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-cream-300 bg-white p-6 text-left shadow-sm sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className={labelClass}>Name</label>
          <input id="cf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={`mt-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="cf-email" className={labelClass}>Email</label>
          <input id="cf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-2 ${inputClass}`} />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="cf-phone" className={labelClass}>Phone (optional)</label>
        <input id="cf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`mt-2 ${inputClass}`} />
      </div>
      <div className="mt-4">
        <label htmlFor="cf-message" className={labelClass}>Message</label>
        <textarea id="cf-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={`mt-2 ${inputClass}`} />
      </div>

      {/* Honeypot — hidden from real users; bots fill it and get silently dropped. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

export default ContactForm;
