import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Woody from './Woody';

// The floating mascot launcher, lower-right, site-wide. The full Woody sticker
// when closed; a small round X button to close when open.
function ChatLauncher({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Close chat' : 'Chat with Woody'}
      aria-expanded={open}
      className={open
        ? 'fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-ember text-white shadow-lg transition-colors hover:bg-ember-600 focus:outline-none focus:ring-2 focus:ring-ember/30'
        : 'fixed bottom-4 right-4 z-50 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-ember/40 motion-safe:hover:scale-105'}
    >
      {open ? (
        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
      ) : (
        <span className="relative block rounded-3xl border-2 border-ember bg-cream-50 px-2 pb-3 pt-2 shadow-xl">
          <Woody className="h-20 w-20 motion-safe:animate-woody-bob" />
          {/* speech-bubble tail */}
          <span className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 rounded-sm border-b-2 border-r-2 border-ember bg-cream-50" />
        </span>
      )}
    </button>
  );
}

ChatLauncher.propTypes = {
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ChatLauncher;
