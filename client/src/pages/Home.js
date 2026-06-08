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
import testimonials from '../data/testimonials';
import faqs from '../data/faqs';
import ReviewsCarousel from '../components/ReviewsCarousel';
import FeedbackModal from '../components/FeedbackModal';
import ContactForm from '../components/ContactForm';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-walnut-700 via-walnut to-walnut-600 text-cream">
      {/* Soft "firelight" glows */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-ember/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-ember/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-3 py-1 text-sm font-semibold text-cream ring-1 ring-inset ring-cream/20">
            <FireIcon className="h-4 w-4 text-ember" aria-hidden="true" />
            Neighbor-run in
            {' '}
            {business.serviceArea}
          </span>

          <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {business.shortPitch}
          </h1>

          <div className="mt-5 flex flex-wrap gap-2">
            {business.valueProps.map((prop) => (
              <span key={prop} className="rounded-full bg-ember/15 px-3 py-1 text-sm font-semibold text-ember-200">
                {prop}
              </span>
            ))}
          </div>

          <p className="mt-6 max-w-xl text-lg text-cream-300">
            {business.tagline}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/order"
              className="rounded-xl bg-ember px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600"
            >
              Order Firewood
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl bg-cream px-6 py-3.5 text-base font-semibold text-walnut shadow-sm transition-colors hover:bg-cream-300"
            >
              View Pricing
            </Link>
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

const steps = [
  { name: 'Place your order', description: 'Choose your bundles or a subscription — at least a day ahead (or request a rush order for sooner).', icon: ShoppingCartIcon },
  { name: 'Pickup or delivery', description: 'Pick a date and a 1-hour window — we deliver to your door, or you grab your bundles from our porch during your window.', icon: TruckIcon },
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
  { name: 'Pickup or delivery', icon: TruckIcon },
];

function WhyVolw() {
  return (
    <section id="why-volw" className="bg-walnut py-16 text-cream sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">Why VOLW Firewood</h2>
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
  // Show the card+Venmo answer for any FAQ that has one, only where Stripe checkout is enabled.
  const [cardEnabled, setCardEnabled] = useState(false);
  useEffect(() => {
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => setCardEnabled(Boolean(res.data.cardEnabled)))
      .catch(() => {});
  }, []);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section id="faq" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">
          Frequently asked
        </h2>
        <div className="mt-10 divide-y divide-cream-300 border-y border-cream-300">
          {faqs.map((item) => {
            const answer = (cardEnabled && item.aWithCard) ? item.aWithCard : item.a;
            return (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-walnut [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="ml-2 shrink-0 text-2xl font-normal leading-none text-ember transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-walnut-400">{answer}</p>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="bg-cream-300/40 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-walnut">Get in touch</h2>
        <p className="mt-3 text-center text-lg text-walnut-400">
          Questions about an order or anything firewood? Send us a message and we&apos;ll get back
          to you.
        </p>
        <p className="mt-1 text-center text-sm text-walnut-300">
          Or email us directly at
          {' '}
          <a href={`mailto:${business.email}`} className="font-semibold text-ember hover:text-ember-600">
            {business.email}
          </a>
          .
        </p>
        <div className="mt-8">
          <ContactForm />
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
      <HowItWorks />
      <WhyVolw />
      <Testimonials />
      <FAQ />
      <ServiceArea />
      <Contact />
    </>
  );
}

export default Home;
