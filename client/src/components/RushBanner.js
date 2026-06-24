import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// 'HH:MM' (24h) -> '9:00 PM'
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`;
}

// Current local time as zero-padded 'HH:MM' for comparing against the cutoff.
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Site-wide "rush delivery available right now" alert. Owner-controlled via the rushAlert setting.
// Shows only when rush is enabled AND the owner has the alert on AND (no cutoff, or before it).
// Re-fetches every 60s so it appears/disappears (and self-hides at the cutoff) without a refresh.
function RushBanner() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = () => {
      axios.get(`${API_URL}/api/settings/availability`)
        .then((res) => { if (!cancelled) setSettings(res.data); })
        .catch(() => { /* ignore — never block the page */ });
    };
    fetchSettings();
    const id = setInterval(fetchSettings, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (!settings || !settings.rushEnabled) return null;
  const alert = settings.rushAlert || {};
  const until = alert.until || '';
  if (!alert.active) return null;
  if (until && nowHHMM() >= until) return null;

  return (
    <div className="bg-ember px-4 py-2 text-center text-sm font-semibold text-white">
      <span aria-hidden="true">🔥 </span>
      Rush delivery available right now
      {until ? ` — order by ${formatTime(until)}` : ''}
      <Link to="/order" className="ml-2 underline underline-offset-2 hover:text-cream-200">
        Order now &rarr;
      </Link>
    </div>
  );
}

export default RushBanner;
