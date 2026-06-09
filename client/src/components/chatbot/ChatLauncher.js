import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Woody from './Woody';

// The floating mascot launcher, lower-right, site-wide. Woody when closed; an X
// to close when open.
function ChatLauncher({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Close chat' : 'Chat with Woody'}
      aria-expanded={open}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ember text-white shadow-lg transition-colors hover:bg-ember-600 focus:outline-none focus:ring-2 focus:ring-ember/30"
    >
      {open
        ? <XMarkIcon className="h-7 w-7" aria-hidden="true" />
        : <Woody className="h-9 w-9 motion-safe:animate-woody-bob" />}
    </button>
  );
}

ChatLauncher.propTypes = {
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ChatLauncher;
