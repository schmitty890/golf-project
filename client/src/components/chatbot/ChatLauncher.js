import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Woody from './Woody';

// The floating mascot launcher, lower-right, site-wide. The full Woody sticker
// when closed; a small round X button to close when open. A green dot + "online"
// label appears when the owner is available for live chat.
function ChatLauncher({ open, online, onToggle }) {
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
        <span className="relative flex flex-col items-center gap-1">
          {online && (
            <span className="absolute right-1 top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-cream bg-green-500" />
            </span>
          )}
          <Woody className="h-14 w-14 drop-shadow-xl motion-safe:animate-woody-bob sm:h-20 sm:w-20" />
          <span className="rounded-full border border-ember bg-cream px-3 py-1 text-xs font-bold text-walnut shadow">
            {online ? 'Chat with us · online' : 'Chat with us'}
          </span>
        </span>
      )}
    </button>
  );
}

ChatLauncher.propTypes = {
  open: PropTypes.bool.isRequired,
  online: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

ChatLauncher.defaultProps = {
  online: false,
};

export default ChatLauncher;
