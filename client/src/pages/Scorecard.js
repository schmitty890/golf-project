import {
  useState, useContext, useEffect, useCallback, useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';

function Scorecard() {
  const { token, user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [rounds, setRounds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('list');
  const [selectedRound, setSelectedRound] = useState(null);

  const [courseName, setCourseName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [players, setPlayers] = useState([{ name: '', scores: Array(18).fill(0) }]);
  const [holes, setHoles] = useState(
    Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4 })),
  );
  const [parsLocked, setParsLocked] = useState(false);
  const [editingPars, setEditingPars] = useState(false);

  // Sharing state
  const [shareCode, setShareCode] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningRound, setJoiningRound] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const resetForm = useCallback(() => {
    setCourseName('');
    setDate(new Date().toISOString().split('T')[0]);
    setPlayers([{ name: '', scores: Array(18).fill(0) }]);
    setHoles(Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4 })));
    setSelectedRound(null);
    setParsLocked(false);
    setEditingPars(false);
    setShareCode('');
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!token) return undefined;

    const socket = io(process.env.REACT_APP_API_URL, {
      auth: { token },
    });

    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('Connected to WebSocket');
    });

    socket.on('score-update', (data) => {
      setPlayers((prev) => {
        const updated = [...prev];
        if (updated[data.playerIndex]) {
          updated[data.playerIndex].scores[data.holeIndex] = data.score;
        }
        return updated;
      });
    });

    socket.on('player-joined', (data) => {
      setPlayers((prev) => {
        const updated = [...prev];
        if (updated[data.playerIndex]) {
          updated[data.playerIndex].userId = data.userId;
        }
        return updated;
      });
    });

    socket.on('player-removed', (data) => {
      setPlayers((prev) => {
        const updated = [...prev];
        if (updated[data.playerIndex]) {
          updated[data.playerIndex].userId = null;
        }
        return updated;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Join room when editing a round
  useEffect(() => {
    if (selectedRound && socketRef.current) {
      // eslint-disable-next-line no-underscore-dangle
      socketRef.current.emit('join-round', selectedRound._id);
    }
    return () => {
      if (selectedRound && socketRef.current) {
        // eslint-disable-next-line no-underscore-dangle
        socketRef.current.emit('leave-round', selectedRound._id);
      }
    };
  }, [selectedRound]);

  const fetchRounds = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/rounds`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setRounds(data);
    } catch (err) {
      setError('Failed to fetch rounds');
    }
  }, [token]);

  // Generate share code for a round
  const handleGenerateShareCode = async (roundId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rounds/${roundId}/share`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setShareCode(data.shareCode);
      setShowShareModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Look up a round by share code
  const handleLookupShareCode = async () => {
    if (!joinCode.trim()) return;
    setError('');
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rounds/lookup/${joinCode.trim()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 404) {
        setError('Invalid share code');
        return;
      }
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to look up round');
      }
      const round = await response.json();
      setJoiningRound(round);
    } catch (err) {
      setError(err.message);
    }
  };

  // Join a specific player slot
  const handleJoinSlot = async () => {
    if (selectedSlot === null || !joiningRound) return;
    setError('');
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rounds/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          // eslint-disable-next-line no-underscore-dangle
          body: JSON.stringify({ shareCode: joiningRound.shareCode, playerIndex: selectedSlot }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      // Successfully joined - refresh rounds and close modal
      setShowJoinModal(false);
      setJoinCode('');
      setJoiningRound(null);
      setSelectedSlot(null);
      fetchRounds();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update score via API for real-time sync
  const handleScoreUpdate = async (playerIndex, holeIndex, score) => {
    if (!selectedRound) return;
    // Update local state immediately
    const updated = [...players];
    updated[playerIndex].scores[holeIndex] = parseInt(score, 10) || 0;
    setPlayers(updated);

    // Send to server
    try {
      await fetch(
        // eslint-disable-next-line no-underscore-dangle
        `${process.env.REACT_APP_API_URL}/api/rounds/${selectedRound._id}/score`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ playerIndex, holeIndex, score: parseInt(score, 10) || 0 }),
        },
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to sync score:', err);
    }
  };

  // Check if current user is the admin (creator) of the round
  const isAdmin = useCallback(() => {
    if (!selectedRound || !user) return false;
    // eslint-disable-next-line no-underscore-dangle
    return selectedRound.createdBy === user._id || selectedRound.createdBy === user.id;
  }, [selectedRound, user]);

  // Check if current user can edit a specific player's scores
  const canEditPlayer = useCallback((playerIndex) => {
    if (isAdmin()) return true;
    if (!user || !players[playerIndex]) return false;
    const player = players[playerIndex];
    // eslint-disable-next-line no-underscore-dangle
    return player.userId === user._id || player.userId === user.id;
  }, [isAdmin, user, players]);

  useEffect(() => {
    if (!authLoading && !token) navigate('/login');
  }, [token, authLoading, navigate]);

  useEffect(() => {
    if (token) fetchRounds();
  }, [token, fetchRounds]);

  const handleCreateRound = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      if (!response.ok) throw new Error(data.error || 'Failed to create round');
      setRounds([data.data, ...rounds]);
      resetForm();
      setView('list');

      // Show share modal with the auto-generated share code (after resetForm to avoid clearing it)
      if (data.data.shareCode) {
        setShareCode(data.data.shareCode);
        setShowShareModal(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRound = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      if (!response.ok) throw new Error(data.error || 'Failed to update round');
      // eslint-disable-next-line no-underscore-dangle
      setRounds(rounds.map((r) => (r._id === roundId ? data.data : r)));
      resetForm();
      setView('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRound = async (roundId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to delete this round? This cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rounds/${roundId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete round');
      }
      // Remove from local state
      // eslint-disable-next-line no-underscore-dangle
      setRounds(rounds.filter((r) => r._id !== roundId));
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditView = (round) => {
    setSelectedRound(round);
    setCourseName(round.courseName);
    setDate(round.date.split('T')[0]);
    setHoles(round.holes);
    setPlayers(round.players);
    setParsLocked(true);
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

  const calculateFront9 = (scores) => scores.slice(0, 9).reduce((sum, s) => sum + s, 0);
  const calculateBack9 = (scores) => scores.slice(9, 18).reduce((sum, s) => sum + s, 0);
  const calculateFront9Par = () => holes.slice(0, 9).reduce((sum, h) => sum + h.par, 0);
  const calculateBack9Par = () => holes.slice(9, 18).reduce((sum, h) => sum + h.par, 0);

  const formatScoreDiff = (total) => {
    const diff = total - calculateTotalPar();
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : diff.toString();
  };

  const getDiffColor = (diff) => {
    if (diff === 'E') return 'text-gray-300';
    if (diff.startsWith('+')) return 'text-red-400';
    return 'text-green-400';
  };

  const getRoundId = (round) => round._id; // eslint-disable-line no-underscore-dangle

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Render scorecard section (Front 9 or Back 9)
  const renderNineHoles = (startHole, endHole, label, subtotalLabel) => {
    const holeSlice = holes.slice(startHole, endHole);
    const subtotalPar = startHole === 0 ? calculateFront9Par() : calculateBack9Par();

    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {label}
        </h4>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full px-4 sm:px-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                    Hole
                  </th>
                  {holeSlice.map((hole) => (
                    <th
                      key={hole.holeNumber}
                      className="px-2 py-3 text-center text-xs font-semibold text-gray-600 min-w-[52px]"
                    >
                      {hole.holeNumber}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-800 uppercase bg-gray-100 min-w-[60px]">
                    {subtotalLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <td className="sticky left-0 bg-gray-50 z-10 px-3 py-3 text-sm font-semibold text-gray-700">
                    Par
                  </td>
                  {holeSlice.map((hole, index) => {
                    const actualIndex = startHole + index;
                    return (
                      <td key={hole.holeNumber} className="px-1 py-2">
                        {parsLocked && !editingPars ? (
                          <div className="w-11 h-11 flex items-center justify-center text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg">
                            {hole.par}
                          </div>
                        ) : (
                          <div
                            className="flex flex-col gap-0.5"
                            role="radiogroup"
                            aria-label={`Hole ${hole.holeNumber} par`}
                          >
                            {[3, 4, 5].map((parValue) => (
                              <button
                                key={parValue}
                                type="button"
                                onClick={() => updateHolePar(actualIndex, parValue)}
                                aria-pressed={hole.par === parValue}
                                className={`w-11 h-8 text-sm font-semibold rounded transition-all ${
                                  hole.par === parValue
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {parValue}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center text-sm font-bold text-gray-800 bg-gray-100">
                    {subtotalPar}
                  </td>
                </tr>
                {players.map((player, playerIndex) => {
                  const playerScores = player.scores.slice(startHole, endHole);
                  const subtotal = startHole === 0
                    ? calculateFront9(player.scores)
                    : calculateBack9(player.scores);
                  return (
                    <tr
                      // eslint-disable-next-line react/no-array-index-key
                      key={`player-${playerIndex}-${label}`}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="sticky left-0 bg-white z-10 px-3 py-3 text-sm font-medium text-gray-900 truncate max-w-[100px]">
                        {player.name || `Player ${playerIndex + 1}`}
                      </td>
                      {playerScores.map((score, holeIndex) => {
                        const actualHoleIndex = startHole + holeIndex;
                        const holePar = holes[actualHoleIndex].par;
                        const scoreValue = score || 0;
                        let scoreBg = '';
                        if (scoreValue > 0 && scoreValue < holePar) {
                          scoreBg = 'bg-green-50 border-green-300';
                        } else if (scoreValue > holePar) {
                          scoreBg = 'bg-red-50 border-red-200';
                        }
                        const canEdit = !selectedRound || canEditPlayer(playerIndex);
                        return (
                          <td key={`score-${actualHoleIndex}`} className="px-1 py-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max="15"
                              value={score || ''}
                              disabled={!canEdit}
                              onChange={(e) => {
                                if (selectedRound) {
                                  handleScoreUpdate(playerIndex, actualHoleIndex, e.target.value);
                                } else {
                                  updatePlayerScore(playerIndex, actualHoleIndex, e.target.value);
                                }
                              }}
                              aria-label={`${player.name || `Player ${playerIndex + 1}`} hole ${actualHoleIndex + 1} score`}
                              className={`w-11 h-11 text-center text-sm font-medium border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all ${scoreBg || 'border-gray-200'} ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center text-sm font-bold text-gray-800 bg-gray-100">
                        {subtotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render totals summary
  const renderTotalsSummary = () => (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4">
        Final Scores
      </h4>
      <div className="space-y-3">
        {players.map((player, index) => {
          const total = calculateTotal(player.scores);
          const diff = formatScoreDiff(total);
          const diffColor = getDiffColor(diff);
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`total-${index}`}
              className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
            >
              <span className="font-medium">{player.name || `Player ${index + 1}`}</span>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">{total}</span>
                <span className={`text-lg font-semibold ${diffColor}`}>{diff}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-sm text-gray-400">
        <span>Course Par</span>
        <span className="font-semibold text-white">{calculateTotalPar()}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Golf Scorecard</h1>
          <p className="mt-2 text-gray-600">Track your rounds and improve your game</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div>
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                type="button"
                onClick={() => setView('create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Round
              </button>
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Join Round
              </button>
            </div>

            {rounds.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-200 mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M9 8h6m-6 4h6m-6 4h6M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No rounds recorded yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Start tracking your golf rounds to see your progress over time
                </p>
                <button
                  type="button"
                  onClick={() => setView('create')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Round
                </button>
              </div>
            ) : (
              /* Rounds Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rounds.map((round) => (
                  <div
                    key={getRoundId(round)}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {round.courseName}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(round.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M9 8h6m-6 4h6m-6 4h6M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{round.players.map((p) => p.name).join(', ')}</span>
                      </div>
                      {round.shareCode && (
                        <div className="mb-3 px-3 py-2 bg-purple-50 rounded-lg text-sm text-purple-700 font-mono">
                          {'Code: '}
                          {round.shareCode}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditView(round)}
                          className="flex-1 py-2.5 px-4 border-2 border-gray-200 text-gray-700 font-medium rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                        >
                          Edit Scores
                        </button>
                        {/* eslint-disable-next-line no-underscore-dangle */}
                        {(round.createdBy === user._id || round.createdBy === user.id) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleGenerateShareCode(getRoundId(round))}
                              className="py-2.5 px-3 border-2 border-purple-200 text-purple-600 font-medium rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                              title="Share Round"
                              aria-label="Share Round"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRound(getRoundId(round))}
                              className="py-2.5 px-3 border-2 border-red-200 text-red-600 font-medium rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                              title="Delete Round"
                              aria-label="Delete Round"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create/Edit View */}
        {(view === 'create' || view === 'edit') && (
          <form onSubmit={view === 'create' ? handleCreateRound : handleUpdateRound}>
            {/* Back Button */}
            <button
              type="button"
              onClick={() => { resetForm(); setView('list'); }}
              className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Rounds
            </button>

            {/* Round Info Card */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {view === 'create' ? 'New Round' : 'Edit Round'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <label htmlFor="courseName" className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Course Name</span>
                  <input
                    id="courseName"
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Pine Valley Golf Club"
                    className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </label>
                <label htmlFor="date" className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Date</span>
                  <input
                    id="date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </label>
              </div>

              {/* Players Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Players</h3>
                  {players.length < 4 && (
                    <button
                      type="button"
                      onClick={addPlayer}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Player
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={`player-input-${index}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        placeholder={`Player ${index + 1} name`}
                        value={player.name}
                        onChange={(e) => updatePlayerName(index, e.target.value)}
                        required
                        aria-label={`Player ${index + 1} name`}
                        className="flex-1 h-11 px-4 text-base border-2 border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      />
                      {players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayer(index)}
                          className="flex-shrink-0 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Remove player ${index + 1}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scorecard Card */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Scorecard</h3>

              {/* Par editing controls */}
              {!parsLocked && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-blue-800">Set the par for each hole, then lock it in.</p>
                  <button
                    type="button"
                    onClick={() => setParsLocked(true)}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Set Pars
                  </button>
                </div>
              )}
              {parsLocked && editingPars && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-yellow-800">Editing pars. Click Done when finished.</p>
                  <button
                    type="button"
                    onClick={() => setEditingPars(false)}
                    className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Done Editing
                  </button>
                </div>
              )}
              {parsLocked && !editingPars && view === 'edit' && isAdmin() && (
                <div className="mb-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingPars(true)}
                    className="px-4 py-2 text-sm border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    Edit Pars
                  </button>
                </div>
              )}

              {renderNineHoles(0, 9, 'Front 9', 'OUT')}
              {renderNineHoles(9, 18, 'Back 9', 'IN')}
              {renderTotalsSummary()}
            </div>

            {/* Action Buttons - only show Save/Cancel for creator or new rounds */}
            {(view === 'create' || isAdmin()) ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl disabled:bg-blue-400 disabled:shadow-none transition-all duration-200"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Round
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setView('list'); }}
                  className="flex-1 sm:flex-none px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => { resetForm(); setView('list'); }}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Back to Rounds
                </button>
              </div>
            )}
          </form>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Share This Round</h3>
              <p className="text-gray-600 mb-4">
                Share this code with other players so they can join and enter their scores.
              </p>
              <div className="bg-purple-50 rounded-lg p-4 mb-6 text-center">
                <p className="text-3xl font-mono font-bold text-purple-700 tracking-wider">
                  {shareCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Join a Round</h3>
              {!joiningRound ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Enter the 6-character code shared by the round creator.
                  </p>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    maxLength={6}
                    className="w-full h-14 px-4 text-2xl font-mono text-center uppercase border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowJoinModal(false);
                        setJoinCode('');
                      }}
                      className="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLookupShareCode}
                      disabled={joinCode.length !== 6}
                      className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                    >
                      Find Round
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-lg font-semibold text-gray-900">{joiningRound.courseName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(joiningRound.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-gray-600 mb-3">Select your player slot:</p>
                  <div className="space-y-2 mb-4">
                    {joiningRound.players.map((player, index) => {
                      // eslint-disable-next-line no-underscore-dangle
                      const isOtherUserSlot = player.userId !== null
                        && player.userId !== user.id
                        && player.userId !== user._id; // eslint-disable-line no-underscore-dangle
                      let slotClass = 'border-gray-200 hover:border-blue-300';
                      if (selectedSlot === index) {
                        slotClass = 'border-blue-500 bg-blue-50';
                      } else if (player.userId) {
                        slotClass = 'border-gray-200 bg-gray-100 cursor-not-allowed';
                      }
                      return (
                        <button
                          type="button"
                          // eslint-disable-next-line react/no-array-index-key
                          key={`slot-${index}`}
                          onClick={() => setSelectedSlot(index)}
                          disabled={isOtherUserSlot}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${slotClass}`}
                        >
                          <span className="font-medium">{player.name}</span>
                          {player.userId && (
                            <span className="ml-2 text-sm text-gray-500">(Claimed)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setJoiningRound(null);
                        setSelectedSlot(null);
                      }}
                      className="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleJoinSlot}
                      disabled={selectedSlot === null}
                      className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors"
                    >
                      Join Round
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Scorecard;
