import PropTypes from 'prop-types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

/**
 * Navigation component for moving between holes
 * Includes prev/next buttons and numbered hole grid
 */
function HoleStepper({
  currentHole,
  totalHoles,
  onPrevious,
  onNext,
  onJumpToHole,
}) {
  const frontNine = Array.from({ length: Math.min(9, totalHoles) }, (_, i) => i + 1);
  const backNine = totalHoles > 9
    ? Array.from({ length: Math.min(9, totalHoles - 9) }, (_, i) => i + 10)
    : [];
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
            {' '}
            {currentHole - 1}
          </span>
        </button>

        <div className="text-center">
          <span className="text-sm font-medium text-gray-500">
            {currentHole}
            {' '}
            of
            {' '}
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
            {' '}
            {currentHole + 1}
          </span>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Numbered hole grid */}
      <div className="mt-6 space-y-3">
        {/* Front 9 */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-9 gap-1 flex-1">
            {frontNine.map((hole) => (
              <button
                key={hole}
                type="button"
                onClick={() => onJumpToHole(hole)}
                className={`flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-all ${
                  hole === currentHole
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
                aria-label={`Go to hole ${hole}`}
              >
                {hole}
              </button>
            ))}
          </div>
          <span className="text-xs font-medium text-gray-400 w-12 text-right">Front</span>
        </div>

        {/* Back 9 */}
        {backNine.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-9 gap-1 flex-1">
              {backNine.map((hole) => (
                <button
                  key={hole}
                  type="button"
                  onClick={() => onJumpToHole(hole)}
                  className={`flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-all ${
                    hole === currentHole
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                  aria-label={`Go to hole ${hole}`}
                >
                  {hole}
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-gray-400 w-12 text-right">Back</span>
          </div>
        )}
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
