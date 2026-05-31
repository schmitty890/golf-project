import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Reset scroll to the top on route changes (React Router doesn't do this by default).
// Hash-aware: if the URL has a #anchor, scroll to that element instead.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
