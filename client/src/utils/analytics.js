// Google Analytics 4 (gtag.js) — env-gated so it only runs where REACT_APP_GA_ID is set.
// In local dev the var is unset, so every function here is a no-op. We load gtag dynamically
// (no npm dependency) and send page views manually on route change since this is an SPA.

const GA_ID = process.env.REACT_APP_GA_ID;

let initialized = false;

function gtag() {
  // GA expects the array-like `arguments` object itself pushed onto the dataLayer, so this
  // can't be an arrow function or use rest params.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

// Inject gtag.js and configure the property. Idempotent and safe to call when GA is disabled.
export function initGA() {
  if (!GA_ID || initialized || typeof window === 'undefined') return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag('js', new Date());
  // send_page_view: false — we fire page views ourselves on each route change (see trackPageview)
  // to avoid double-counting the initial load.
  gtag('config', GA_ID, { send_page_view: false });
}

// Record a single-page-app page view for the given path (e.g. '/order?ref=ABC').
export function trackPageview(path) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

// Record a custom event (e.g. a 'purchase' conversion). Params are passed straight to GA4.
export function trackEvent(name, params = {}) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', name, params);
}
