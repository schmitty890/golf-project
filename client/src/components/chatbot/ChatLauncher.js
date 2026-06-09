import PropTypes from 'prop-types';
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

// The floating speech-bubble button, lower-right, site-wide.
function ChatLauncher({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Close chat' : 'Open chat'}
      aria-expanded={open}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ember text-white shadow-lg transition-colors hover:bg-ember-600 focus:outline-none focus:ring-2 focus:ring-ember/30"
    >
      {open
        ? <XMarkIcon className="h-7 w-7" aria-hidden="true" />
        : <ChatBubbleLeftRightIcon className="h-7 w-7" aria-hidden="true" />}
    </button>
  );
}

ChatLauncher.propTypes = {
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ChatLauncher;
