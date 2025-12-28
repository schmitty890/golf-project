import PropTypes from 'prop-types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

/**
 * Navigation component for moving between holes
 * Includes prev/next buttons and progress dots
 */
function HoleStepper({
  currentHole,
  totalHoles,
  onPrevious,
  onNext,
  onJumpToHole,
}) {
  const holes = Array.from({ length: totalHoles }, (_, i) => i + 1);
  const canGoPrevious = currentHole > 1;
  const canGoNext = currentHole < totalHoles;

  return (
    <div className="w-full px-4 py-6">
      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="flex items-center gap-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span>
            Hole
            {currentHole - 1}
          </span>
        </button>

        <div className="text-center">
          <span className="text-sm font-medium text-gray-500">
            {currentHole}
            {' '}
            of
            {totalHoles}
          </span>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="flex items-center gap-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>
            Hole
            {currentHole + 1}
          </span>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="mt-6 flex justify-center gap-1.5">
        {holes.map((hole) => (
          <button
            key={hole}
            type="button"
            onClick={() => onJumpToHole(hole)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              hole === currentHole
                ? 'bg-indigo-600 scale-125'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to hole ${hole}`}
          />
        ))}
      </div>
    </div>
  );
}

HoleStepper.propTypes = {
  currentHole: PropTypes.number.isRequired,
  totalHoles: PropTypes.number,
  onPrevious: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onJumpToHole: PropTypes.func.isRequired,
};

HoleStepper.defaultProps = {
  totalHoles: 18,
};

export default HoleStepper;
