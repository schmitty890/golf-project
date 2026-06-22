import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ChatLauncher from './ChatLauncher';
import ChatPanel from './ChatPanel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Mounted once, site-wide (above <Routes> in App.js) so the conversation persists
// across navigation — e.g. when the bot deep-links to /order.
const HIDE_ON = ['/login', '/register'];
// Stores the epoch-ms of the last time the nudge was dismissed (X'd or chat opened).
const NUDGE_KEY = 'volw-woody-nudge-dismissed-at';
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // re-show a day after dismissal

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [online, setOnline] = useState(false);
  const { pathname } = useLocation();

  // Poll the owner's live-chat availability so the launcher's green dot stays current.
  useEffect(() => {
    let cancelled = false;
    const fetchAvailability = () => {
      axios.get(`${API_URL}/api/settings/availability`)
        .then((res) => { if (!cancelled) setOnline(Boolean(res.data.chat?.available)); })
        .catch(() => {});
    };
    fetchAvailability();
    const id = setInterval(fetchAvailability, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // The nudge stays until dismissed; once dismissed it stays hidden for the
  // cooldown. Show it (after a short beat) unless it was dismissed recently.
  useEffect(() => {
    let dismissedAt = 0;
    try { dismissedAt = Number(localStorage.getItem(NUDGE_KEY)) || 0; } catch { dismissedAt = 0; }
    const shouldShow = !dismissedAt || (Date.now() - dismissedAt) >= NUDGE_COOLDOWN_MS;
    if (!shouldShow) return undefined;
    const showT = setTimeout(() => setShowNudge(true), 1500);
    return () => clearTimeout(showT);
  // Run once on mount; the cooldown decision is read from localStorage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dismissing (X'ing it or engaging with the chat) hides it and starts the cooldown.
  const dismissNudge = useCallback(() => {
    setShowNudge(false);
    try { localStorage.setItem(NUDGE_KEY, String(Date.now())); } catch { /* ignore */ }
  }, []);

  const openChat = useCallback(() => {
    dismissNudge();
    setOpen(true);
  }, [dismissNudge]);

  if (HIDE_ON.includes(pathname)) return null;

  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} />}

      {showNudge && !open && (
        <div className="fixed bottom-[9.5rem] right-4 z-50">
          <div className="relative">
            <button
              type="button"
              onClick={openChat}
              className="block max-w-[15rem] rounded-2xl rounded-br-sm border border-cream-300 bg-white py-2 pl-3 pr-7 text-left text-sm font-medium text-walnut shadow-lg transition-colors hover:border-ember"
            >
              Hi, I&apos;m Woody! Need firewood? I can help. 🔥
            </button>
            <button
              type="button"
              onClick={dismissNudge}
              aria-label="Dismiss"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-walnut text-cream shadow"
            >
              <XMarkIcon className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <ChatLauncher
        open={open}
        online={online}
        onToggle={() => (open ? setOpen(false) : openChat())}
      />
    </>
  );
}

export default ChatWidget;
