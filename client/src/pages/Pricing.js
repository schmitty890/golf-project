import { Link } from 'react-router-dom';
import {
  products, DELIVERY_FEE,
  subscriptionMonthly, SUB_MIN_BUNDLES, SUB_MAX_BUNDLES, SUB_PER_BUNDLE,
} from '../data/pricing';
import business from '../data/business';

function Pricing() {
  return (
    <div className="bg-cream">
      {/* Header */}
      <section className="bg-gradient-to-br from-walnut-700 via-walnut to-walnut-600 text-cream">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Pricing</h1>
          <p className="mt-4 text-lg text-cream-300">
            Hand-split, ready-to-burn hardwood for
            {' '}
            {business.serviceArea}
            . Pickup is free; delivery is a flat $
            {DELIVERY_FEE}
            {' '}
            per order.
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-walnut">Order anytime</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-4 rounded-2xl border border-cream-300 bg-white p-6 shadow-sm">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-walnut">{p.name}</h3>
                <p className="mt-1 text-sm text-walnut-400">{p.description}</p>
              </div>
              <p className="shrink-0 text-2xl font-extrabold text-ember">{`$${p.price}`}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-walnut-300">
          {`Delivery to your driveway: flat $${DELIVERY_FEE} per order. Pickup is free.`}
        </p>
      </section>

      {/* Subscriptions */}
      <section className="bg-cream-300/40 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-walnut">
            Monthly subscriptions
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-walnut-300">
            {`Never run out — pick any size from ${SUB_MIN_BUNDLES} to ${SUB_MAX_BUNDLES} bundles, delivered every month at $${SUB_PER_BUNDLE} a bundle.`}
          </p>
          <p className="mx-auto mt-1 max-w-xl text-center text-xs text-walnut-300">
            Billed automatically to your card each month — cancel anytime.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[SUB_MIN_BUNDLES, 5, SUB_MAX_BUNDLES].map((n) => (
              <div key={n} className="rounded-2xl border border-cream-300 bg-white p-6 text-center shadow-sm">
                <h3 className="text-lg font-bold text-walnut">{`${n} bundles / month`}</h3>
                <p className="mt-2 text-3xl font-extrabold text-ember">{`$${subscriptionMonthly(n)}/mo`}</p>
                <p className="mt-3 text-sm text-walnut-400">{`$${SUB_PER_BUNDLE} per bundle, delivered.`}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-xl text-center text-xs text-walnut-300">
            Want a different size? Choose anything in between on the order form.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Link
          to="/order"
          className="inline-block rounded-xl bg-ember px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600"
        >
          Order now
        </Link>
        <p className="mt-3 text-sm text-walnut-300">Quick, secure checkout — pay by card or Venmo.</p>
      </section>
    </div>
  );
}

export default Pricing;
