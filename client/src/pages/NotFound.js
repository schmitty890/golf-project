import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-cream px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-ember">404</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-walnut sm:text-4xl">
        This page went up in smoke
      </h1>
      <p className="mt-4 max-w-md text-lg text-walnut-400">
        We couldn&apos;t find the page you&apos;re looking for. It may have moved, or the link
        might be out of date.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-xl bg-ember px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ember-600"
        >
          Back home
        </Link>
        <Link
          to="/order"
          className="rounded-xl border border-ember bg-white px-6 py-2.5 text-sm font-semibold text-ember transition-colors hover:bg-ember hover:text-white"
        >
          Order firewood
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
