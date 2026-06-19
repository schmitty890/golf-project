import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageview } from '../utils/analytics';

// Loads Google Analytics once, then reports a page view on every client-side route change.
// No-op when REACT_APP_GA_ID is unset (see utils/analytics.js).
function AnalyticsTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    trackPageview(pathname + search);
  }, [pathname, search]);

  return null;
}

export default AnalyticsTracker;
