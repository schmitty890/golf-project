import PropTypes from 'prop-types';
import ScoreInput from './ScoreInput';

/**
 * Get color class for score display
 */
function getScoreColorClass(score, par) {
  if (!score || !par) return 'text-gray-400';
  const diff = score - par;
  if (diff < 0) return 'text-green-600';
  if (diff === 0) return 'text-gray-600';
  return 'text-red-500';
}

/**
 * Get score label for display
 */
function getScoreLabel(score, par) {
  if (!score || !par) return '';
  const diff = score - par;
  if (diff === 0) return 'Par';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * Full-screen card for entering score on a single hole
 */
function HoleCard({
  holeNumber,
  par,
  currentUserName,
  currentUserScore,
  otherPlayers,
  onScoreChange,
  canEdit,
}) {
  return (
    <div className="flex flex-col items-center px-4 py-6">
      {/* Hole header */}
      <div className="mb-8 text-center">
        <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Hole
        </div>
        <div className="text-6xl font-bold text-gray-900">{holeNumber}</div>
        <div className="mt-1 text-lg font-medium text-gray-600">
          Par
          {par}
        </div>
      </div>

      {/* Current user score input */}
      <div className="mb-8 w-full max-w-xs rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 text-center text-sm font-medium uppercase tracking-wide text-gray-500">
          {currentUserName || 'Your Score'}
        </div>
        <ScoreInput
          value={currentUserScore}
          par={par}
          onChange={onScoreChange}
          disabled={!canEdit}
        />
      </div>

      {/* Other players scores */}
      {otherPlayers && otherPlayers.length > 0 && (
        <div className="w-full max-w-xs">
          <div className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Other Players
          </div>
          <div className="space-y-2">
            {otherPlayers.map((player) => (
              <div
                key={player.name}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm"
              >
                <span className="font-medium text-gray-700">{player.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${getScoreColorClass(player.score, par)}`}>
                    {player.score || '-'}
                  </span>
                  {player.score && par && (
                    <span className={`text-sm ${getScoreColorClass(player.score, par)}`}>
                      (
                      {getScoreLabel(player.score, par)}
                      )
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

HoleCard.propTypes = {
  holeNumber: PropTypes.number.isRequired,
  par: PropTypes.number,
  currentUserName: PropTypes.string,
  currentUserScore: PropTypes.number,
  otherPlayers: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      score: PropTypes.number,
    }),
  ),
  onScoreChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
};

HoleCard.defaultProps = {
  par: null,
  currentUserName: null,
  currentUserScore: null,
  otherPlayers: [],
  canEdit: true,
};

export default HoleCard;
