import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import CelebrationOverlay, { getTeamFlag } from '../../components/CelebrationOverlay';

const DISMISSAL_TYPES = [
  'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped',
  'Hit Wicket', 'Caught & Bowled', 'Retired Hurt', 'Obstructing the Field',
];

/* ─── Wicket Modal ─── */
function WicketModal({ players, bowlingTeamPlayers, striker, nonStriker, onConfirm, onClose }) {
  const [dismissalType, setDismissalType] = useState('Bowled');
  const [fielder, setFielder] = useState('');
  const [outBatsman, setOutBatsman] = useState(striker?.name || '');
  const [newBatsman, setNewBatsman] = useState('');

  const needsFielder = ['Caught', 'Run Out', 'Stumped', 'Caught & Bowled'].includes(dismissalType);
  const availableBatsmen = players.filter(
    (p) => p.name !== striker?.name && p.name !== nonStriker?.name && !p.isOut
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-score text-2xl text-red-400 tracking-wider">WICKET!</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Dismissal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Dismissal Type</label>
            <select
              value={dismissalType}
              onChange={(e) => setDismissalType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
            >
              {DISMISSAL_TYPES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Fielder */}
          {needsFielder && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Fielder</label>
              <select
                value={fielder}
                onChange={(e) => setFielder(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              >
                <option value="">Select fielder</option>
                {bowlingTeamPlayers.map((p, i) => (
                  <option key={i} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Out Batsman */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Out Batsman</label>
            <div className="grid grid-cols-2 gap-2">
              {[striker, nonStriker].filter(Boolean).map((bat) => (
                <button
                  key={bat.name}
                  type="button"
                  onClick={() => setOutBatsman(bat.name)}
                  className={`py-3 rounded-lg text-sm font-medium transition-all ${
                    outBatsman === bat.name
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-navy-800 text-gray-400 border border-white/10 hover:bg-white/5'
                  }`}
                >
                  {bat.name} {bat.isStriker ? '*' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* New Batsman */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">New Batsman</label>
            <select
              value={newBatsman}
              onChange={(e) => setNewBatsman(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            >
              <option value="">Select new batsman</option>
              {availableBatsmen.map((p, i) => (
                <option key={i} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-navy-700 text-gray-300 font-medium hover:bg-navy-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ dismissalType, fielder, outBatsman, newBatsman })}
            disabled={!outBatsman || !newBatsman}
            className="flex-1 py-3 rounded-lg bg-red-500/20 text-red-400 font-medium border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Wicket
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bowler Selection Modal ─── */
function BowlerModal({ bowlers, currentBowler, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-score text-2xl text-accent tracking-wider mb-5">Select Bowler</h3>
        <div className="space-y-2">
          {bowlers.map((bowler, i) => (
            <button
              key={i}
              onClick={() => onSelect(bowler)}
              disabled={bowler.name === currentBowler?.name}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                bowler.name === currentBowler?.name
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-navy-800 text-white hover:bg-white/10 border border-white/5 hover:border-accent/30'
              }`}
            >
              <span className="font-medium">{bowler.name}</span>
              {bowler.overs !== undefined && (
                <span className="text-sm text-gray-400">
                  {bowler.overs}-{bowler.maidens || 0}-{bowler.runs || 0}-{bowler.wickets || 0}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-lg bg-navy-700 text-gray-300 font-medium hover:bg-navy-600 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── End Innings / Complete Match Modal ─── */
function EndModal({ type, teams, onConfirm, onClose }) {
  const [result, setResult] = useState('');
  const [playerOfMatch, setPlayerOfMatch] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6">
        <h3 className="font-score text-2xl text-white tracking-wider mb-5">
          {type === 'innings' ? 'End Innings' : 'Complete Match'}
        </h3>

        {type === 'match' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Result</label>
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="e.g., India won by 5 wickets"
                className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Player of the Match</label>
              <input
                type="text"
                value={playerOfMatch}
                onChange={(e) => setPlayerOfMatch(e.target.value)}
                placeholder="Player name"
                className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
          </div>
        )}

        <p className="text-gray-400 text-sm mb-6">
          {type === 'innings'
            ? 'Are you sure you want to end this innings?'
            : 'Are you sure you want to complete this match?'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-navy-700 text-gray-300 font-medium hover:bg-navy-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ result, playerOfMatch })}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              type === 'innings'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                : 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30'
            }`}
          >
            {type === 'innings' ? 'End Innings' : 'Complete Match'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ScoreEntry Page ─── */
export default function ScoreEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(null); // 'innings' or 'match'

  // Extra state
  const [isWide, setIsWide] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);

  // Celebration state
  const [celebration, setCelebration] = useState(null);

  // Current over balls for visualization
  const [currentOverBalls, setCurrentOverBalls] = useState([]);

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      const data = res.data.match || res.data;
      setMatch(data);
      setCurrentOverBalls(data.currentOverBalls || []);
    } catch (err) {
      setError('Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const currentInnings = match?.innings?.[match?.currentInnings || 0];
  const battingTeam = (match?.currentInnings || 0) === 0 ? match?.teamA : match?.teamB;
  const bowlingTeam = (match?.currentInnings || 0) === 0 ? match?.teamB : match?.teamA;
  const striker = currentInnings?.currentBatsmen?.find((b) => b.isStriker);
  const nonStriker = currentInnings?.currentBatsmen?.find((b) => !b.isStriker);
  const currentBowler = currentInnings?.currentBowler;

  const submitBall = async (ballData) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/matches/${id}/ball`, ballData);
      const updated = res.data.match || res.data;
      setMatch(updated);
      setCurrentOverBalls(updated.currentOverBalls || []);
      setIsWide(false);
      setIsNoBall(false);

      // Trigger local celebration
      if (ballData.isWicket) {
        setCelebration('wicket');
      } else if (!ballData.isWide && !ballData.isNoBall) {
        if (ballData.runs === 4) {
          setCelebration('four');
        } else if (ballData.runs === 6) {
          setCelebration('six');
        }
      }

      // Check if over ended (prompt bowler selection)
      if (res.data.overComplete) {
        setShowBowlerModal(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to record ball');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunClick = (runs) => {
    submitBall({
      runs,
      isWide,
      isNoBall,
      isWicket: false,
    });
  };

  const handleWicketConfirm = (wicketData) => {
    submitBall({
      runs: 0,
      isWide: false,
      isNoBall: false,
      isWicket: true,
      ...wicketData,
    });
    setShowWicketModal(false);
  };

  const handleBowlerSelect = async (bowler) => {
    try {
      await api.post(`/matches/${id}/bowler`, { bowlerName: bowler.name });
      await fetchMatch();
      setShowBowlerModal(false);
    } catch (err) {
      setError('Failed to set bowler');
    }
  };

  const handleUndo = async () => {
    try {
      const res = await api.post(`/matches/${id}/undo`);
      const updated = res.data.match || res.data;
      setMatch(updated);
      setCurrentOverBalls(updated.currentOverBalls || []);
    } catch (err) {
      setError('Failed to undo');
    }
  };

  const handleEndInnings = async () => {
    try {
      await api.post(`/matches/${id}/end-innings`);
      await fetchMatch();
      setShowEndModal(null);
      setShowBowlerModal(true);
    } catch (err) {
      setError('Failed to end innings');
    }
  };

  const handleCompleteMatch = async ({ result, playerOfMatch }) => {
    try {
      await api.post(`/matches/${id}/complete`, { result, playerOfMatch });
      navigate(`/match/${id}/result`);
    } catch (err) {
      setError('Failed to complete match');
    }
  };

  const getBallLabel = (ball) => {
    if (ball.isWicket) return 'W';
    if (ball.isWide) return 'WD';
    if (ball.isNoBall) return `${ball.runs}+NB`;
    return String(ball.runs);
  };

  const getBallClass = (ball) => {
    if (ball.isWicket) return 'ball-dot-W';
    if (ball.isWide) return 'ball-dot-WD';
    if (ball.isNoBall) return 'ball-dot-NB';
    if (ball.runs === 4) return 'ball-dot-4';
    if (ball.runs === 6) return 'ball-dot-6';
    if (ball.runs === 0) return 'ball-dot-0';
    return 'ball-dot-1';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-gray-400">Loading scoring panel...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="font-score text-3xl text-white mb-4">Match Not Found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8 page-enter">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* ── Score Display ── */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            {getTeamFlag(battingTeam?.name, battingTeam?.shortName) && (
              <span className="text-xl select-none">
                {getTeamFlag(battingTeam?.name, battingTeam?.shortName)}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{battingTeam?.name || battingTeam?.shortName}</span>
          </div>
          <span className="live-badge-live">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
            SCORING
          </span>
        </div>
        <div className="flex items-end justify-between">
          <p className="font-score text-5xl text-white">
            {currentInnings?.totalRuns || 0}
            <span className="text-gray-400 text-3xl">/{currentInnings?.totalWickets || 0}</span>
          </p>
          <div className="text-right">
            <p className="font-score text-2xl text-gray-300">
              {currentInnings?.oversDisplay || currentInnings?.overs || '0.0'}
            </p>
            <p className="text-xs text-gray-500">overs</p>
          </div>
        </div>
        {/* Target info for 2nd innings */}
        {currentInnings?.target && (
          <div className="mt-2 pt-2 border-t border-white/5 text-sm text-gray-400">
            Target: <span className="text-accent font-semibold">{currentInnings.target}</span>
            {' • Need '}
            <span className="text-accent font-semibold">
              {currentInnings.target - (currentInnings?.totalRuns || 0)}
            </span> runs
          </div>
        )}
      </div>

      {/* ── Current Batsmen ── */}
      <div className="glass-card p-4 mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Batsmen</h4>
        <div className="space-y-2">
          {[striker, nonStriker].filter(Boolean).map((bat, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {bat.isStriker && (
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">*</span>
                )}
                <span className={`font-medium ${bat.isStriker ? 'text-white' : 'text-gray-400'}`}>
                  {bat.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-score text-lg text-white">{bat.runs || 0}</span>
                <span className="text-gray-500">({bat.balls || 0})</span>
                <span className="text-xs text-gray-600">4s:{bat.fours || 0}</span>
                <span className="text-xs text-gray-600">6s:{bat.sixes || 0}</span>
              </div>
            </div>
          ))}
          {!striker && !nonStriker && (
            <p className="text-gray-500 text-sm">No batsmen at crease</p>
          )}
        </div>
      </div>

      {/* ── Current Bowler ── */}
      <div className="glass-card p-4 mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bowler</h4>
        {currentBowler ? (
          <div className="flex items-center justify-between">
            <span className="font-medium text-white">{currentBowler.name}</span>
            <span className="text-sm text-gray-400">
              {currentBowler.overs}-{currentBowler.maidens || 0}-{currentBowler.runs || 0}-{currentBowler.wickets || 0}
              <span className="text-accent ml-2 text-xs">
                Eco: {currentBowler.economy?.toFixed?.(1) || currentBowler.economy || '0.0'}
              </span>
            </span>
          </div>
        ) : (
          <button
            onClick={() => setShowBowlerModal(true)}
            className="text-accent text-sm hover:underline"
          >
            Select Bowler →
          </button>
        )}
      </div>

      {/* ── Current Over Visualization ── */}
      <div className="glass-card p-4 mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">This Over</h4>
        <div className="flex items-center gap-2 flex-wrap min-h-[32px]">
          {currentOverBalls.length > 0 ? currentOverBalls.map((ball, i) => (
            <span key={i} className={getBallClass(ball)}>{getBallLabel(ball)}</span>
          )) : (
            <span className="text-gray-600 text-sm">New over</span>
          )}
        </div>
      </div>

      {/* ── Extras Toggle ── */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setIsWide(!isWide); setIsNoBall(false); }}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
            isWide
              ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
              : 'bg-navy-800 text-gray-400 border-2 border-white/5 hover:border-white/15'
          }`}
        >
          WD {isWide && '✓'}
        </button>
        <button
          onClick={() => { setIsNoBall(!isNoBall); setIsWide(false); }}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
            isNoBall
              ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
              : 'bg-navy-800 text-gray-400 border-2 border-white/5 hover:border-white/15'
          }`}
        >
          NB {isNoBall && '✓'}
        </button>
      </div>

      {/* ── Run Buttons ── */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <button onClick={() => handleRunClick(0)} disabled={submitting} className="run-btn-normal col-span-1">0</button>
        <button onClick={() => handleRunClick(1)} disabled={submitting} className="run-btn-normal col-span-1">1</button>
        <button onClick={() => handleRunClick(2)} disabled={submitting} className="run-btn-normal col-span-1">2</button>
        <button onClick={() => handleRunClick(3)} disabled={submitting} className="run-btn-normal col-span-1">3</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <button onClick={() => handleRunClick(4)} disabled={submitting} className="run-btn-boundary py-4 text-3xl">
          4
        </button>
        <button onClick={() => handleRunClick(6)} disabled={submitting} className="run-btn-boundary py-4 text-3xl">
          6
        </button>
        <button
          onClick={() => setShowWicketModal(true)}
          disabled={submitting}
          className="run-btn-wicket py-4 text-3xl"
        >
          W
        </button>
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          type="button"
          disabled
          title="Undo is disabled until full scoring history snapshots are implemented."
          className="py-3 rounded-xl bg-navy-700/50 text-gray-500 text-sm font-medium border border-white/5 cursor-not-allowed"
        >
          ↩ Undo Off
        </button>
        <button
          onClick={() => setShowBowlerModal(true)}
          className="py-3 rounded-xl bg-navy-700 text-gray-300 text-sm font-medium hover:bg-navy-600 border border-white/5 transition-all active:scale-95"
        >
          🔄 Bowler
        </button>
        <button
          onClick={() => setShowEndModal('innings')}
          className="py-3 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 border border-yellow-500/20 transition-all active:scale-95"
        >
          End Inn.
        </button>
      </div>

      {/* ── Complete Match Button ── */}
      <button
        onClick={() => setShowEndModal('match')}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 text-navy-950 font-bold text-lg hover:from-accent-400 hover:to-accent transition-all duration-200 shadow-lg shadow-accent/20 active:scale-[0.98]"
      >
        Complete Match
      </button>

      {/* ── Modals ── */}
      {showWicketModal && (
        <WicketModal
          players={battingTeam?.players || []}
          bowlingTeamPlayers={bowlingTeam?.players || []}
          striker={striker}
          nonStriker={nonStriker}
          onConfirm={handleWicketConfirm}
          onClose={() => setShowWicketModal(false)}
        />
      )}

      {showBowlerModal && (
        <BowlerModal
          bowlers={bowlingTeam?.players || []}
          currentBowler={currentBowler}
          onSelect={handleBowlerSelect}
          onClose={() => setShowBowlerModal(false)}
        />
      )}

      {showEndModal && (
        <EndModal
          type={showEndModal}
          teams={[match.teamA, match.teamB]}
          onConfirm={showEndModal === 'innings' ? handleEndInnings : handleCompleteMatch}
          onClose={() => setShowEndModal(null)}
        />
      )}

      {/* Full-Screen Celebration Overlay */}
      {celebration && (
        <CelebrationOverlay type={celebration} onClose={() => setCelebration(null)} />
      )}
    </div>
  );
}
