import PropTypes from 'prop-types';
import {
  CalendarIcon, UserGroupIcon, ShareIcon, TrashIcon,
} from '@heroicons/react/24/outline';

/**
 * Calculate total score for a player
 */
function calculateTotal(scores) {
  if (!scores || !Array.isArray(scores)) return null;
  const validScores = scores.filter((s) => s != null);
  if (validScores.length === 0) return null;
  return validScores.reduce((sum, score) => sum + score, 0);
}

/**
 * Calculate total par
 */
function calculateTotalPar(holes) {
  if (!holes || !Array.isArray(holes)) return null;
  const validPars = holes.filter((h) => h?.par != null).map((h) => h.par);
  if (validPars.length === 0) return null;
  return validPars.reduce((sum, par) => sum + par, 0);
}

/**
 * Get color class based on score vs par
 */
function getScoreColorClass(total, totalPar) {
  if (total == null || totalPar == null) return 'text-gray-400';
  const diff = total - totalPar;
  if (diff < 0) return 'text-green-600';
  if (diff === 0) return 'text-gray-600';
  return 'text-red-500';
}

/**
 * Get differential display
 */
function getDifferential(total, totalPar) {
  if (total == null || totalPar == null) return '';
  const diff = total - totalPar;
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * Format date for display
 * Parses YYYY-MM-DD as local date to avoid timezone issues
 */
function formatDate(dateString) {
  if (!dateString) return 'No date';
  // Extract just the date part (YYYY-MM-DD) in case it includes time
  const datePart = dateString.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return 'Invalid date';
  const [year, month, day] = parts.map(Number);
  // Parse manually to avoid UTC interpretation
  // "2025-12-28" should display as Dec 28, not Dec 27
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Enhanced round card with player score previews
 */
function RoundCard({
  round,
  onContinue,
  onShare,
  onDelete,
}) {
  const players = round.players || [];
  const holes = round.holes || [];
  const totalPar = calculateTotalPar(holes);
  const playerCount = players.filter((p) => p?.name).length;

  // Check if round is complete (all holes have scores for at least one player)
  const holesWithScores = holes.filter((h) => {
    const hasAnyScore = players.some((p) => {
      const score = h.scores?.[p.name];
      return score != null;
    });
    return hasAnyScore;
  }).length;
  const isComplete = holesWithScores === holes.length && holes.length > 0;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {round.courseName || 'Untitled Round'}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {formatDate(round.date)}
            </span>
            <span className="flex items-center gap-1">
              <UserGroupIcon className="h-4 w-4" />
              {playerCount}
              {' '}
              {playerCount === 1 ? 'player' : 'players'}
            </span>
          </div>
        </div>
        {isComplete && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Complete
          </span>
        )}
      </div>

      {/* Player scores */}
      {playerCount > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {players.filter((p) => p?.name).map((player) => {
            const scores = holes.map((h) => h.scores?.[player.name]);
            const total = calculateTotal(scores);
            const colorClass = getScoreColorClass(total, totalPar);

            return (
              <div
                key={player.name}
                className="rounded-lg bg-gray-50 p-3 text-center"
              >
                <div className="truncate text-sm font-medium text-gray-600">
                  {player.name}
                </div>
                <div className={`mt-1 text-2xl font-bold ${colorClass}`}>
                  {total ?? '-'}
                </div>
                {total != null && totalPar != null && (
                  <div className={`text-sm font-medium ${colorClass}`}>
                    {getDifferential(total, totalPar)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
        >
          {isComplete ? 'View Scorecard' : 'Continue Round'}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="rounded-lg bg-gray-100 p-2.5 text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300"
          aria-label="Share round"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-gray-100 p-2.5 text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
          aria-label="Delete round"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

RoundCard.propTypes = {
  round: PropTypes.shape({
    _id: PropTypes.string,
    courseName: PropTypes.string,
    date: PropTypes.string,
    players: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
      }),
    ),
    holes: PropTypes.arrayOf(
      PropTypes.shape({
        holeNumber: PropTypes.number,
        par: PropTypes.number,
        scores: PropTypes.objectOf(PropTypes.number),
      }),
    ),
  }).isRequired,
  onContinue: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default RoundCard;
