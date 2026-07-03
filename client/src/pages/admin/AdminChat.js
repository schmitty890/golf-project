/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useEffect, useRef } from 'react';
import { useAdminChat } from '../../context/AdminChatContext';

const inputClass = 'rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-walnut focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

// Presentational chat dashboard — all socket/state lives in AdminChatContext so notifications work
// app-wide. This page just renders the list/transcript and the availability toggle + reply input.
function AdminChat() {
  const {
    conversations, selectedId, messages, available, error,
    selectConversation, sendReply, toggleAvailable,
  } = useAdminChat();

  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendReply(text);
    setText('');
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-walnut">Live chat</h1>
        <label className="flex items-center gap-2 text-sm font-semibold text-walnut">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => toggleAvailable(e.target.checked)}
            className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
          />
          <span className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${available ? 'bg-green-500' : 'bg-gray-300'}`} />
            {available ? "I'm available to chat" : 'Unavailable'}
          </span>
        </label>
      </div>
      <p className="mt-1 text-sm text-walnut-400">
        While available, customers see a green dot and can chat live. It stays on until you turn it
        off, and auto-turns off after a couple hours as a safety net. If a customer messages while
        you&apos;re away, we email you and send them a quick &quot;leave your number&quot; reply.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-[18rem_1fr]">
        {/* Conversation list */}
        <div className="rounded-xl border border-cream-300 bg-white">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-walnut-400">No conversations yet.</p>
          ) : (
            <ul className="divide-y divide-cream-300">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className={`flex w-full items-start justify-between gap-2 p-3 text-left transition-colors hover:bg-cream-100 ${selectedId === c.id ? 'bg-cream-100' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-walnut">
                        {c.customerName || 'Customer'}
                        {c.isGuest && <span className="ml-1 text-xs font-normal text-walnut-300">(guest)</span>}
                      </span>
                      <span className="block truncate text-xs text-walnut-400">{c.lastMessageText || '—'}</span>
                    </span>
                    {c.unreadForAdmin > 0 && (
                      <span className="shrink-0 rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-white">
                        {c.unreadForAdmin}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Transcript + reply */}
        <div className="flex h-[28rem] flex-col rounded-xl border border-cream-300 bg-white">
          {!selectedId ? (
            <p className="m-auto text-sm text-walnut-400">Pick a conversation to reply.</p>
          ) : (
            <>
              <div className="border-b border-cream-300 px-4 py-2 text-sm font-semibold text-walnut">
                {selected?.customerName || 'Customer'}
                {selected?.customerEmail && (
                  <span className="ml-2 text-xs font-normal text-walnut-400">{selected.customerEmail}</span>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={m.from === 'agent' ? 'flex justify-end' : 'flex'}>
                    <div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${m.from === 'agent' ? 'bg-ember text-white' : 'border border-cream-300 bg-cream text-walnut'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={handleSend} className="flex gap-2 border-t border-cream-300 p-3">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a reply…"
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="rounded-lg bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminChat;
