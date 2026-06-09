import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ChatLauncher from './ChatLauncher';
import ChatPanel from './ChatPanel';

// Mounted once, site-wide (above <Routes> in App.js) so the conversation persists
// across navigation — e.g. when the bot deep-links to /order.
const HIDE_ON = ['/login', '/register'];
const NUDGE_KEY = 'volw-woody-nudge-seen';

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const { pathname } = useLocation();

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // First-visit nudge: pop Woody's bubble once ever, a couple seconds in.
  useEffect(() => {
    if (HIDE_ON.includes(pathname)) return undefined;
    let seen = true;
    try { seen = Boolean(localStorage.getItem(NUDGE_KEY)); } catch { seen = true; }
    if (seen) return undefined;
    const showT = setTimeout(() => {
      setShowNudge(true);
      try { localStorage.setItem(NUDGE_KEY, '1'); } catch { /* ignore */ }
    }, 2000);
    const hideT = setTimeout(() => setShowNudge(false), 10000);
    return () => { clearTimeout(showT); clearTimeout(hideT); };
  // Run once on mount — the nudge is a first-visit, one-time affair.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (HIDE_ON.includes(pathname)) return null;

  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} />}

      {showNudge && !open && (
        <div className="fixed bottom-[8.5rem] right-4 z-50">
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowNudge(false); setOpen(true); }}
              className="block max-w-[15rem] rounded-2xl rounded-br-sm border border-cream-300 bg-white py-2 pl-3 pr-7 text-left text-sm font-medium text-walnut shadow-lg transition-colors hover:border-ember"
            >
              Hi, I&apos;m Woody! Need firewood? I can help. 🔥
            </button>
            <button
              type="button"
              onClick={() => setShowNudge(false)}
              aria-label="Dismiss"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-walnut text-cream shadow"
            >
              <XMarkIcon className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <ChatLauncher open={open} onToggle={() => setOpen((v) => !v)} />
    </>
  );
}

export default ChatWidget;
