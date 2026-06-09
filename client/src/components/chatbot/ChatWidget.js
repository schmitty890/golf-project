import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatLauncher from './ChatLauncher';
import ChatPanel from './ChatPanel';

// Mounted once, site-wide (above <Routes> in App.js) so the conversation persists
// across navigation — e.g. when the bot deep-links to /order.
const HIDE_ON = ['/login', '/register'];

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (HIDE_ON.includes(pathname)) return null;

  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
      <ChatLauncher open={open} onToggle={() => setOpen((v) => !v)} />
    </>
  );
}

export default ChatWidget;
