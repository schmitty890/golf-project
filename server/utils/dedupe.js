// Normalizers for matching a customer across orders (first-order-deal reuse guard).
// Stored on each Order as phoneKey/streetKey so eligibility can match by phone or address,
// not just account — see models/Order.js (pre-save hook) and routes/promos.js (hasPriorOrder).

// Phone -> digits only, e.g. '(704) 770-1181' -> '7047701181'. Returns '' if there aren't
// enough digits to be a real match key (avoids matching on junk like '123').
export function phoneKey(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits : '';
}

// Street -> lowercased, punctuation/whitespace collapsed, e.g. '123 Main St.' -> '123 main st'.
// Best-effort: catches obvious repeats, not deliberate obfuscation.
export function streetKey(street) {
  return String(street || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
