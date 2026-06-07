import { Link } from 'react-router-dom';
import {
  products, subscriptions, DELIVERY_FEE,
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
            Never run out — bundles delivered every month.
          </p>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
            {subscriptions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-cream-300 bg-white p-6 text-center shadow-sm">
                <h3 className="text-lg font-bold text-walnut">{s.name}</h3>
                <p className="mt-2 text-3xl font-extrabold text-ember">{s.priceLabel}</p>
                <p className="mt-3 text-sm text-walnut-400">{s.description}</p>
              </div>
            ))}
          </div>
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
        <p className="mt-3 text-sm text-walnut-300">No payment online — we confirm and arrange Venmo with you.</p>
      </section>
    </div>
  );
}

export default Pricing;
