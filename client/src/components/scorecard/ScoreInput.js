import PropTypes from 'prop-types';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';

/**
 * Get the score label based on score vs par
 */
function getScoreLabel(score, par) {
  if (!score || !par) return null;
  // Hole in one always takes priority
  if (score === 1) return 'Hole in One!';
  const diff = score - par;
  switch (diff) {
    case -3: return 'Albatross';
    case -2: return 'Eagle';
    case -1: return 'Birdie';
    case 0: return 'Par';
    case 1: return 'Bogey';
    case 2: return 'Double Bogey';
    case 3: return 'Triple Bogey';
    default: return diff < -3 ? `${diff}` : null;
  }
}

/**
 * Get color classes based on score vs par
 */
function getScoreColor(score, par) {
  if (!score || !par) return 'text-gray-400';
  const diff = score - par;
  if (diff < -1) return 'text-green-600'; // Eagle or better
  if (diff === -1) return 'text-green-500'; // Birdie
  if (diff === 0) return 'text-gray-600'; // Par
  if (diff === 1) return 'text-red-400'; // Bogey
  if (diff === 2) return 'text-red-500'; // Double
  return 'text-red-600'; // Triple or worse
}

/**
 * Get background color classes based on score vs par
 */
function getScoreBgColor(score, par) {
  if (!score || !par) return 'bg-gray-50';
  const diff = score - par;
  if (diff < 0) return 'bg-green-50';
  if (diff === 0) return 'bg-gray-50';
  return 'bg-red-50';
}

/**
 * Large tap-friendly score input with +/- buttons
 */
function ScoreInput({
  value,
  par,
  onChange,
  disabled,
}) {
  const handleDecrement = () => {
    if (value > 1) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < 15) {
      onChange(value + 1);
    }
  };

  const diff = value && par ? value - par : null;
  const getDiffDisplay = () => {
    if (diff === null) return '';
    if (diff > 0) return `+${diff}`;
    if (diff === 0) return 'E';
    return `${diff}`;
  };
  const diffDisplay = getDiffDisplay();

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4">
        {/* Decrement button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= 1}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Decrease score"
        >
          <MinusIcon className="h-8 w-8" />
        </button>

        {/* Score display */}
        <div className={`flex h-20 w-24 items-center justify-center rounded-xl ${getScoreBgColor(value, par)}`}>
          <span className={`text-5xl font-bold ${value ? getScoreColor(value, par) : 'text-gray-300'}`}>
            {value || '-'}
          </span>
        </div>

        {/* Increment button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= 15}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Increase score"
        >
          <PlusIcon className="h-8 w-8" />
        </button>
      </div>

      {/* Score label */}
      {value && par && getScoreLabel(value, par) && (
        <div className={`mt-2 text-sm font-medium ${getScoreColor(value, par)}`}>
          {diffDisplay}
          {' '}
          (
          {getScoreLabel(value, par)}
          )
        </div>
      )}
    </div>
  );
}

ScoreInput.propTypes = {
  value: PropTypes.number,
  par: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

ScoreInput.defaultProps = {
  value: null,
  par: null,
  disabled: false,
};

export default ScoreInput;
