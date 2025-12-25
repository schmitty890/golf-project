import {
  useState, useContext, useEffect, useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Scorecard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedRound, setSelectedRound] = useState(null);

  // Form state for creating/editing
  const [courseName, setCourseName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [players, setPlayers] = useState([{ name: '', scores: Array(18).fill(0) }]);
  const [holes, setHoles] = useState(
    Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4 })),
  );

  const resetForm = useCallback(() => {
    setCourseName('');
    setDate(new Date().toISOString().split('T')[0]);
    setPlayers([{ name: '', scores: Array(18).fill(0) }]);
    setHoles(Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4 })));
    setSelectedRound(null);
  }, []);

  const fetchRounds = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/rounds`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setRounds(data);
      }
    } catch (err) {
      setError('Failed to fetch rounds');
    }
  }, [token]);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Fetch rounds on mount
  useEffect(() => {
    if (token) {
      fetchRounds();
    }
  }, [token, fetchRounds]);

  const handleCreateRound = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseName, date, holes, players,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create round');
      }

      setRounds([data.data, ...rounds]);
      resetForm();
      setView('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRound = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // eslint-disable-next-line no-underscore-dangle
      const roundId = selectedRound._id;
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rounds/${roundId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            courseName, date, holes, players,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update round');
      }

      // eslint-disable-next-line no-underscore-dangle
      setRounds(rounds.map((r) => (r._id === roundId ? data.data : r)));
      resetForm();
      setView('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditView = (round) => {
    setSelectedRound(round);
    setCourseName(round.courseName);
    setDate(round.date.split('T')[0]);
    setHoles(round.holes);
    setPlayers(round.players);
    setView('edit');
  };

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([...players, { name: '', scores: Array(holes.length).fill(0) }]);
    }
  };

  const removePlayer = (index) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index, name) => {
    const updated = [...players];
    updated[index].name = name;
    setPlayers(updated);
  };

  const updatePlayerScore = (playerIndex, holeIndex, score) => {
    const updated = [...players];
    updated[playerIndex].scores[holeIndex] = parseInt(score, 10) || 0;
    setPlayers(updated);
  };

  const updateHolePar = (index, par) => {
    const updated = [...holes];
    updated[index].par = parseInt(par, 10) || 4;
    setHoles(updated);
  };

  const calculateTotal = (scores) => scores.reduce((sum, s) => sum + s, 0);

  const calculateTotalPar = () => holes.reduce((sum, h) => sum + h.par, 0);

  const formatScoreDiff = (total) => {
    const diff = total - calculateTotalPar();
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : diff.toString();
  };

  const getRoundId = (round) => round._id; // eslint-disable-line no-underscore-dangle

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Golf Scorecard</h1>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {view === 'list' && (
          <div>
            <button
              type="button"
              onClick={() => setView('create')}
              className="mb-6 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              New Round
            </button>

            {rounds.length === 0 ? (
              <p className="text-gray-600">No rounds yet. Create your first round!</p>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Players
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rounds.map((round) => (
                      <tr key={getRoundId(round)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(round.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {round.courseName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {round.players.map((p) => p.name).join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            type="button"
                            onClick={() => openEditView(round)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit Scores
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(view === 'create' || view === 'edit') && (
          <form onSubmit={view === 'create' ? handleCreateRound : handleUpdateRound}>
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {view === 'create' ? 'New Round' : 'Edit Round'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <label htmlFor="courseName" className="block">
                  <span className="block text-sm font-medium text-gray-700">
                    Course Name
                  </span>
                  <input
                    id="courseName"
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
                <label htmlFor="date" className="block">
                  <span className="block text-sm font-medium text-gray-700">
                    Date
                  </span>
                  <input
                    id="date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">Players</h3>
                  {players.length < 4 && (
                    <button
                      type="button"
                      onClick={addPlayer}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Player
                    </button>
                  )}
                </div>
                {players.map((player, index) => {
                  const playerKey = `player-${index}`;
                  return (
                    <div key={playerKey} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder={`Player ${index + 1} name`}
                        value={player.name}
                        onChange={(e) => updatePlayerName(index, e.target.value)}
                        required
                        aria-label={`Player ${index + 1} name`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayer(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6 overflow-x-auto">
              <h3 className="text-lg font-medium mb-4">Scorecard</h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left text-sm font-medium text-gray-700">
                      Hole
                    </th>
                    {holes.map((hole) => (
                      <th
                        key={hole.holeNumber}
                        className="px-2 py-2 text-center text-sm font-medium text-gray-700 min-w-[50px]"
                      >
                        {hole.holeNumber}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center text-sm font-medium text-gray-700">
                      Total
                    </th>
                    <th className="px-2 py-2 text-center text-sm font-medium text-gray-700">
                      +/-
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-gray-50">
                    <td className="px-2 py-2 text-sm font-medium text-gray-700">Par</td>
                    {holes.map((hole, index) => (
                      <td key={hole.holeNumber} className="px-1 py-1">
                        <input
                          type="number"
                          min="3"
                          max="5"
                          value={hole.par}
                          onChange={(e) => updateHolePar(index, e.target.value)}
                          aria-label={`Hole ${hole.holeNumber} par`}
                          className="w-12 text-center px-1 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center text-sm font-semibold">
                      {calculateTotalPar()}
                    </td>
                    <td className="px-2 py-2 text-center text-sm">-</td>
                  </tr>
                  {players.map((player, playerIndex) => {
                    const scoreRowKey = `score-${playerIndex}`;
                    return (
                      <tr key={scoreRowKey} className="border-b">
                        <td className="px-2 py-2 text-sm font-medium text-gray-700">
                          {player.name || `Player ${playerIndex + 1}`}
                        </td>
                        {holes.map((hole, holeIndex) => {
                          const handleScoreChange = (e) => {
                            updatePlayerScore(playerIndex, holeIndex, e.target.value);
                          };
                          return (
                            <td key={hole.holeNumber} className="px-1 py-1">
                              <input
                                type="number"
                                min="1"
                                max="15"
                                value={player.scores[holeIndex] || ''}
                                onChange={handleScoreChange}
                                aria-label={`${player.name || `Player ${playerIndex + 1}`} hole ${hole.holeNumber} score`}
                                className="w-12 text-center px-1 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center text-sm font-semibold">
                          {calculateTotal(player.scores)}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold">
                          {formatScoreDiff(calculateTotal(player.scores))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? 'Saving...' : 'Save Round'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView('list');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Scorecard;
