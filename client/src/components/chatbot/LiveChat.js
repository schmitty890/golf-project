import {
  useEffect, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import ChatMessage from './ChatMessage';
import useLiveChat from './useLiveChat';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

// In-widget live chat with the owner. Fills the panel body (transcript + input). Customer messages
// render on the right ('user'); the owner's replies render on the left ('agent').
function LiveChat({ onExit }) {
  const { connected, messages, send } = useLiveChat(true);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    send(text);
    setText('');
  };

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-center text-xs text-walnut-400">
          You&apos;re chatting live with VOLW Firewood. Only you and the owner can see this.
        </p>
        {messages.map((m) => (
          <ChatMessage key={m.id} from={m.from === 'agent' ? 'agent' : 'user'} text={m.text} />
        ))}
        {messages.length === 0 && (
          <p className="text-center text-sm text-walnut-300">
            Say hi — we&apos;ll reply right here.
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-cream-300 p-3">
        <form onSubmit={handleSend} className="space-y-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={connected ? 'Type a message…' : 'Connecting…'}
            aria-label="Type a message"
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onExit}
              className="rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-semibold text-walnut transition-colors hover:border-ember"
            >
              ← Menu
            </button>
            <button
              type="submit"
              disabled={!connected || !text.trim()}
              className="flex-1 rounded-xl bg-ember px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ember-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

LiveChat.propTypes = {
  onExit: PropTypes.func.isRequired,
};

export default LiveChat;
