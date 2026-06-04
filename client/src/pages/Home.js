import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  TruckIcon,
  SparklesIcon,
  MapPinIcon,
  ClockIcon,
  ShoppingCartIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import business from '../data/business';
import { bundles, getActivePacks, subscriptions } from '../data/pricing';
import testimonials from '../data/testimonials';
import faqs from '../data/faqs';
import ReviewsCarousel from '../components/ReviewsCarousel';
import FeedbackModal from '../components/FeedbackModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function Hero() {
  return (
    <section className="relative overflow-hidden bg-walnut text-cream">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {business.shortPitch}
          </h1>
          <p className="mt-4 text-lg font-semibold text-ember">
            {business.valueProps.join(' • ')}
          </p>
          <p className="mt-6 text-lg text-cream-300">
            {business.tagline}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/order"
              className="rounded-md bg-ember px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-ember-600 transition-colors"
            >
              Order Firewood
            </Link>
            <a
              href="#pricing"
              className="rounded-md bg-cream px-6 py-3 text-base font-semibold text-walnut shadow-sm hover:bg-cream-300 transition-colors"
            >
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-walnut">About VOLW Firewood</h2>
        <p className="mt-6 text-lg text-walnut-400">
          VOLW Firewood is run by a fellow resident of
          {' '}
          {business.serviceArea}
          {' '}
          — a neighbor supplying neighbors. We personally gather and hand-split the
          wood, then deliver clean, ready-to-burn campfire bundles right to your door.
        </p>
        <p className="mt-4 text-lg text-walnut-400">
          We&apos;re built for last-minute backyard fires — small bundles delivered
          fast, not cords or bulk loads. Order from us and you&apos;re supporting
          someone right here in the neighborhood.
        </p>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-cream-300/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">Pricing</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-walnut-300">
          Bundles only — no cords or bulk loads. Perfect for a last-minute backyard fire.
        </p>
        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="rounded-2xl border border-cream-300 bg-cream p-8 shadow-sm"
            >
              <h3 className="text-lg font-bold text-walnut">{bundle.name}</h3>
              <p className="mt-2 text-3xl font-extrabold text-ember">
                {bundle.price}
                <span className="text-base font-semibold text-walnut-300"> / bundle</span>
              </p>
              <p className="mt-3 text-sm text-walnut-400">{bundle.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/order"
            className="rounded-md bg-ember px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-ember-600 transition-colors"
          >
            Order Now
          </Link>
        </div>
      </div>
    </section>
  );
}

function Subscriptions() {
  return (
    <section id="subscriptions" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">
          Subscriptions
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-walnut-400">
          Never run out — set up a recurring delivery and we&apos;ll handle the rest.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl border border-cream-300 bg-cream-50 p-8 text-center shadow-sm"
            >
              <h3 className="text-lg font-bold text-walnut">{sub.name}</h3>
              <p className="mt-2 text-3xl font-extrabold text-ember">{sub.price}</p>
              <p className="mt-1 text-sm font-semibold text-walnut">{sub.cadence}</p>
              <p className="mt-3 text-sm text-walnut-400">{sub.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeasonalPacks() {
  const activePacks = getActivePacks();
  if (activePacks.length === 0) return null;

  return (
    <section id="seasonal-packs" className="bg-cream-300/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">
          Seasonal Packages
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {activePacks.map((pack) => (
            <div
              key={pack.id}
              className="rounded-2xl border border-cream-300 bg-cream p-8 text-center shadow-sm"
            >
              <h3 className="text-lg font-bold text-walnut">{pack.name}</h3>
              <p className="mt-2 text-3xl font-extrabold text-ember">{pack.price}</p>
              <p className="mt-1 text-sm font-semibold text-walnut">
                {pack.bundleCount}
                {' '}
                bundles
              </p>
              <p className="mt-3 text-sm text-walnut-400">{pack.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { name: 'Place your order', description: 'Choose your bundles, packs, or a subscription online.', icon: ShoppingCartIcon },
  { name: 'We deliver', description: 'We bring clean firewood to your doorstep or driveway.', icon: TruckIcon },
  { name: 'You enjoy', description: 'Light it up and enjoy a cozy fire — no hassle.', icon: FireIcon },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">
          How It Works
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.name} className="text-center">
              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ember text-white">
                <step.icon className="h-7 w-7" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-walnut text-xs font-bold text-cream ring-2 ring-cream">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-walnut">{step.name}</h3>
              <p className="mt-2 text-sm text-walnut-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const reasons = [
  { name: 'Local', icon: MapPinIcon },
  { name: 'Clean bundles', icon: SparklesIcon },
  { name: 'Predictable delivery', icon: ClockIcon },
  { name: 'Delivery included', icon: TruckIcon },
];

function WhyVolw() {
  return (
    <section id="why-volw" className="bg-walnut py-16 text-cream sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">Why VOLW</h2>
        <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {reasons.map((reason) => (
            <div key={reason.name} className="flex flex-col items-center text-center">
              <reason.icon className="h-10 w-10 text-ember" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">{reason.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceArea() {
  return (
    <section id="service-area" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <MapPinIcon className="mx-auto h-10 w-10 text-ember" aria-hidden="true" />
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-walnut">Service Area</h2>
        <p className="mt-4 text-lg text-walnut-400">
          Serving
          {' '}
          {business.serviceArea}
          {' '}
          exclusively.
        </p>
      </div>
    </section>
  );
}

function Gallery() {
  const photos = business.galleryPhotos || [];
  if (photos.length === 0) return null;

  return (
    <section id="gallery" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="h-48 w-full rounded-xl object-cover shadow-sm"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Fallback content (hardcoded samples) when no approved reviews exist yet.
const fallbackItems = (testimonials || []).map((t) => ({
  name: t.name, text: t.quote, detail: t.detail, rating: null,
}));

function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/feedback/approved`)
      .then((res) => setReviews(res.data || []))
      .catch(() => setReviews([]));
  }, []);

  const items = reviews.length > 0
    ? reviews.map((r) => ({
      name: r.name, text: r.comment, detail: r.location, rating: r.rating,
    }))
    : fallbackItems;

  if (items.length === 0) return null;

  return (
    <section id="testimonials" className="bg-cream-300/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">
          What neighbors say
        </h2>

        <ReviewsCarousel items={items} />

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-xl border border-ember bg-white px-6 py-2.5 text-sm font-semibold text-ember transition-colors hover:bg-ember hover:text-white"
          >
            Leave feedback
          </button>
        </div>
      </div>

      <FeedbackModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}

function FAQ() {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section id="faq" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">
          Frequently asked
        </h2>
        <div className="mt-10 divide-y divide-cream-300 border-y border-cream-300">
          {faqs.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-walnut [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="ml-2 shrink-0 text-2xl font-normal leading-none text-ember transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-walnut-400">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <About />
      <Gallery />
      <Pricing />
      <Subscriptions />
      <SeasonalPacks />
      <HowItWorks />
      <WhyVolw />
      <Testimonials />
      <FAQ />
      <ServiceArea />
      {/* Contact lives in the footer (#contact) */}
    </>
  );
}

export default Home;
