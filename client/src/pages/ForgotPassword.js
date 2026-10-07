import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

// Ask for a password-reset link. The API always answers the same way (so it never reveals which
// emails have accounts); we just show its message.
function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong — please try again.');
      setSent(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="mb-10 flex flex-col items-center">
          <Link to="/" aria-label="VOLW Firewood home"><Logo size="md" /></Link>
          <h2 className="mt-8 text-center text-2xl/9 font-bold tracking-tight text-walnut">
            Reset your password
          </h2>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <p className="rounded-md bg-green-50 p-4 text-sm text-green-800">{sent}</p>
            <p className="text-sm text-walnut-400">The link works for 1 hour. Check your spam folder if you don&apos;t see it.</p>
            <Link to="/login" className="font-semibold text-ember hover:text-ember-600">Back to sign in</Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <p className="text-sm text-walnut-400">
              Enter the email you signed up with and we&apos;ll send you a link to choose a new
              password.
            </p>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label htmlFor="email-address" className="block text-sm/6 font-medium text-walnut">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputClass}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-ember px-3 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm/6 text-walnut-400">
              Remembered it?
              {' '}
              <Link to="/login" className="font-semibold text-ember hover:text-ember-600">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
