import { useState, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Logo from '../components/Logo';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

// Landing page for the emailed reset link (/reset-password/:token). Sets a new password, then signs
// the customer straight in.
function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don’t match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong — please try again.');
      login(data.user, data.token);
      navigate('/my-orders');
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
            Choose a new password
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
              {error.includes('expired') && (
                <Link to="/forgot-password" className="mt-2 inline-block text-sm font-semibold text-ember hover:text-ember-600">
                  Send a new link
                </Link>
              )}
            </div>
          )}
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="password" className="block text-sm/6 font-medium text-walnut">
              New password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="confirm-password" className="block text-sm/6 font-medium text-walnut">
              Confirm new password
            </label>
            <div className="mt-2">
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className={inputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ember px-3 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
