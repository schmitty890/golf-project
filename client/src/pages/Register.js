import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Logo from '../components/Logo';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, token, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect to orders if already authenticated
  useEffect(() => {
    if (!authLoading && token) navigate('/my-orders');
  }, [token, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      login(data.user, data.token);
      navigate('/my-orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-walnut-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="mb-10 flex flex-col items-center">
          <Link to="/" aria-label="VOLW Firewood home"><Logo size="md" /></Link>
          <h2 className="mt-8 text-center text-2xl/9 font-bold tracking-tight text-walnut">
            Create your account
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

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
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-walnut outline outline-1 -outline-offset-1 outline-cream-300 placeholder:text-walnut-200 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ember sm:text-sm/6"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="password" className="block text-sm/6 font-medium text-walnut">
              Password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-walnut outline outline-1 -outline-offset-1 outline-cream-300 placeholder:text-walnut-200 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ember sm:text-sm/6"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-ember px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ember-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <p className="text-center text-sm/6 text-walnut-400">
            Already have an account?
            {' '}
            <Link to="/login" className="font-semibold text-ember hover:text-ember-600">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
