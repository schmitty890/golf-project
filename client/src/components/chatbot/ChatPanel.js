import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ContactForm from '../ContactForm';
import ChatMessage from './ChatMessage';
import ChatChoices from './ChatChoices';
import useChatMachine from './useChatMachine';

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

function ChatPanel({ onClose }) {
  const {
    messages, node, options, inputConfig, inputError, contactMode,
    choose, submitInput, exitContact,
  } = useChatMachine({ onClose });

  const [text, setText] = useState('');
  const logEndRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the log pinned to the latest message.
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, options, contactMode]);

  // Clear + focus the field whenever we move to a new input step.
  useEffect(() => {
    setText('');
    if (inputConfig) inputRef.current?.focus();
  }, [node.id, inputConfig]);

  const handleSend = (e) => {
    e.preventDefault();
    submitInput(text);
  };

  let body;
  if (contactMode) {
    body = (
      <div className="space-y-3">
        <ContactForm />
        <button
          type="button"
          onClick={exitContact}
          className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-semibold text-walnut transition-colors hover:border-ember"
        >
          ← Back to menu
        </button>
      </div>
    );
  } else if (inputConfig) {
    body = (
      <form onSubmit={handleSend} className="space-y-2">
        <input
          ref={inputRef}
          type={inputConfig.inputType}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={inputConfig.placeholder}
          aria-label={inputConfig.placeholder}
          className={inputClass}
        />
        {inputError && <p className="text-sm text-red-600">{inputError}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-ember px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ember-600"
        >
          Send
        </button>
      </form>
    );
  } else {
    body = <ChatChoices options={options} onChoose={choose} />;
  }

  return (
    <div
      role="dialog"
      aria-label="VOLW Firewood chat"
      className="fixed bottom-24 right-5 z-50 flex max-h-[70vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col rounded-2xl border border-cream-300 bg-cream shadow-2xl"
    >
      <header className="flex items-center justify-between rounded-t-2xl bg-walnut px-4 py-3">
        <span className="font-semibold text-cream">VOLW Firewood</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-lg p-1 text-cream transition-colors hover:bg-walnut-700"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <ChatMessage key={m.key} from={m.from} text={m.text} />
        ))}
        <div ref={logEndRef} />
      </div>

      <div className="border-t border-cream-300 p-3">
        {body}
      </div>
    </div>
  );
}

ChatPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ChatPanel;
