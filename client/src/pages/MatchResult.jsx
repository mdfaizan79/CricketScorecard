import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

function ConfettiPiece({ index }) {
  const colors = ['#00ff87', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 2;
  const duration = 2 + Math.random() * 2;

  return (
    <div
      className="absolute w-2 h-2 rounded-full opacity-0"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        top: '-10px',
        animation: `confettiFall ${duration}s ease-out ${delay}s forwards`,
      }}
    />
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-score text-2xl text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function MatchResult() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await api.get(`/matches/${id}`);
        setMatch(res.data.match || res.data);
      } catch (err) {
        console.error('Failed to fetch match:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-gray-400">Loading result...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="font-score text-3xl text-white mb-4">Match Not Found</h2>
        <Link to="/" className="text-accent hover:underline">Back to Home</Link>
      </div>
    );
  }

  const inn1 = match.innings?.[0];
  const inn2 = match.innings?.[1];

  // Find top scorer
  const allBatting = [
    ...(inn1?.batting || []).map(b => ({ ...b, team: match.teamA?.shortName })),
    ...(inn2?.batting || []).map(b => ({ ...b, team: match.teamB?.shortName })),
  ];
  const topScorer = allBatting.sort((a, b) => (b.runs || 0) - (a.runs || 0))[0];

  // Find best bowler
  const allBowling = [
    ...(inn1?.bowling || []).map(b => ({ ...b, team: match.teamB?.shortName })),
    ...(inn2?.bowling || []).map(b => ({ ...b, team: match.teamA?.shortName })),
  ];
  const bestBowler = allBowling.sort((a, b) => (b.wickets || 0) - (a.wickets || 0))[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
        {Array.from({ length: 30 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
      `}</style>

      {/* Winner Banner */}
      <div className="relative glass-card p-8 md:p-12 text-center mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/5" />
        <div className="relative">
          <span className="text-5xl mb-4 block">🏆</span>
          <h1 className="font-score text-4xl md:text-5xl tracking-wider text-white mb-3">
            Match Result
          </h1>
          {match.result && (
            <p className="text-accent text-lg md:text-xl font-semibold">{match.result}</p>
          )}

          {/* Score Summary */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">{match.teamA?.shortName || match.teamA?.name}</p>
              <p className="font-score text-3xl text-white">
                {inn1?.totalRuns || 0}/{inn1?.totalWickets || 0}
              </p>
              <p className="text-xs text-gray-500">({inn1?.overs || 0} ov)</p>
            </div>
            <span className="text-2xl text-gray-600 font-score">VS</span>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">{match.teamB?.shortName || match.teamB?.name}</p>
              <p className="font-score text-3xl text-white">
                {inn2?.totalRuns || 0}/{inn2?.totalWickets || 0}
              </p>
              <p className="text-xs text-gray-500">({inn2?.overs || 0} ov)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Player of the Match */}
      {match.playerOfMatch && (
        <div className="glass-card p-6 mb-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Player of the Match</p>
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-xl">
              ⭐
            </div>
            <div className="text-left">
              <p className="font-score text-2xl text-accent tracking-wider">
                {match.playerOfMatch.name || match.playerOfMatch}
              </p>
              {match.playerOfMatch.performance && (
                <p className="text-sm text-gray-400">{match.playerOfMatch.performance}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {topScorer && (
          <StatCard
            label="Top Scorer"
            value={`${topScorer.runs || 0}(${topScorer.balls || 0})`}
            sub={topScorer.name}
          />
        )}
        {bestBowler && (
          <StatCard
            label="Best Bowler"
            value={`${bestBowler.wickets || 0}/${bestBowler.runs || 0}`}
            sub={bestBowler.name}
          />
        )}
        <StatCard
          label="Total Fours"
          value={allBatting.reduce((sum, b) => sum + (b.fours || 0), 0)}
        />
        <StatCard
          label="Total Sixes"
          value={allBatting.reduce((sum, b) => sum + (b.sixes || 0), 0)}
        />
      </div>

      {/* Full Scorecards */}
      {match.innings?.map((inn, idx) => {
        if (!inn) return null;
        const teamName = idx === 0 ? (match.teamA?.name || 'Team A') : (match.teamB?.name || 'Team B');
        return (
          <div key={idx} className="glass-card overflow-hidden mb-6">
            <div className="px-4 py-3 bg-white/5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{teamName} Innings</h3>
                <span className="font-score text-xl text-white">
                  {inn.totalRuns}/{inn.totalWickets}
                  <span className="text-sm text-gray-400 font-body ml-1">({inn.oversDisplay || inn.overs} ov)</span>
                </span>
              </div>
            </div>

            {/* Batting */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-2">Batter</th>
                    <th className="text-center px-2 py-2">R</th>
                    <th className="text-center px-2 py-2">B</th>
                    <th className="text-center px-2 py-2">4s</th>
                    <th className="text-center px-2 py-2">6s</th>
                    <th className="text-center px-2 py-2">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.batting?.map((bat, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2">
                        <span className="text-white font-medium">{bat.name}</span>
                        {bat.dismissal && <p className="text-xs text-gray-500">{bat.dismissal}</p>}
                      </td>
                      <td className="text-center px-2 py-2 font-semibold text-white">{bat.runs}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bat.balls}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bat.fours || 0}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bat.sixes || 0}</td>
                      <td className="text-center px-2 py-2 text-accent">
                        {bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bowling */}
            <div className="border-t border-white/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-2">Bowler</th>
                    <th className="text-center px-2 py-2">O</th>
                    <th className="text-center px-2 py-2">M</th>
                    <th className="text-center px-2 py-2">R</th>
                    <th className="text-center px-2 py-2">W</th>
                    <th className="text-center px-2 py-2">ECO</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.bowling?.map((bowl, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 text-white font-medium">{bowl.name}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bowl.overs}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bowl.maidens || 0}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bowl.runs}</td>
                      <td className="text-center px-2 py-2 font-semibold text-white">{bowl.wickets}</td>
                      <td className="text-center px-2 py-2 text-accent">
                        {bowl.economy?.toFixed?.(1) || bowl.economy || '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Back Button */}
      <div className="text-center mt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 transition-all"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
