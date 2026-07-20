import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Public page reached from the "Unsubscribe" link in a newsletter email. Uses a confirm button
// (not an auto-action) so email clients that pre-fetch links can't unsubscribe someone by accident.
function Unsubscribe() {
  const { token } = useParams();
  const [state, setState] = useState('idle'); // 'idle' | 'busy' | 'done' | 'error'

  const confirm = async () => {
    setState('busy');
    try {
      await axios.post(`${API_URL}/api/newsletter/unsubscribe/${token}`);
      setState('done');
    } catch {
      setState('error');
    }
  };

  let content;
  if (state === 'done') {
    content = (
      <p className="mt-4 max-w-md text-lg text-walnut-400">
        You&apos;ve been unsubscribed — you won&apos;t get newsletter emails from us anymore. You
        can always re-subscribe from your account.
      </p>
    );
  } else if (state === 'error') {
    content = (
      <p className="mt-4 max-w-md text-lg text-walnut-400">
        Sorry, that unsubscribe link didn&apos;t work. It may be invalid or expired — you can
        manage email preferences from your account instead.
      </p>
    );
  } else {
    content = (
      <>
        <p className="mt-4 max-w-md text-lg text-walnut-400">
          Unsubscribe from VOLW Firewood newsletter emails?
        </p>
        <button
          type="button"
          onClick={confirm}
          disabled={state === 'busy'}
          className="mt-8 rounded-xl bg-ember px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ember-600 disabled:opacity-50"
        >
          {state === 'busy' ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
        </button>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-walnut sm:text-3xl">
        VOLW Firewood emails
      </h1>
      {content}
      <Link to="/" className="mt-8 text-sm font-semibold text-ember hover:underline">
        Back to volwfirewood.com
      </Link>
    </div>
  );
}

export default Unsubscribe;
