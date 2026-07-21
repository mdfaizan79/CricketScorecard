import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

function StatsTable({ title, headers, rows }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 bg-white/5 border-b border-white/5">
        <h3 className="font-score text-lg tracking-wider text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 text-xs uppercase">
              {headers.map((h, i) => (
                <th key={i} className={`px-3 py-2 ${i === 0 ? 'text-left' : 'text-center'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-2.5 ${
                      j === 0 ? 'text-left text-white font-medium' : 'text-center text-gray-300'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await api.get(`/players/${id}`);
        setPlayer(res.data.player || res.data);
      } catch (err) {
        console.error('Failed to fetch player:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-gray-400">Loading player...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="font-score text-3xl text-white mb-4">Player Not Found</h2>
        <Link to="/" className="text-accent hover:underline">Back to Home</Link>
      </div>
    );
  }

  const batting = player.battingStats || {};
  const bowling = player.bowlingStats || {};
  const recentMatches = player.recentMatches || [];

  const roleColors = {
    Batsman: 'from-blue-500 to-blue-700',
    Bowler: 'from-red-500 to-red-700',
    'All-Rounder': 'from-purple-500 to-purple-700',
    'Wicket-Keeper': 'from-yellow-500 to-yellow-700',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 page-enter">
      {/* Player Header */}
      <div className="player-profile-hero glass-card p-6 md:p-8 mb-8 overflow-hidden relative">
        <div className="absolute -right-8 -top-10 text-[13rem] leading-none font-score font-black text-white/[0.035] select-none">
          {player.jerseyNumber ?? '—'}
        </div>
        <div className="flex items-center gap-5">
          <div
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${
              roleColors[player.role] || 'from-accent/30 to-accent/10'
            } flex items-center justify-center text-3xl md:text-4xl font-bold text-white shadow-lg`}
          >
            {player.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 relative">
            <h1 className="font-score text-3xl md:text-4xl tracking-wider text-white">
              {player.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {player.team && (
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {player.team}
                </span>
              )}
              {player.role && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
                  {player.role}
                </span>
              )}
              <span className="jersey-chip" title="Jersey number">
                <span>JERSEY</span> #{player.jerseyNumber ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Matches</p>
          <p className="font-score text-3xl text-white">{batting.matches || bowling.matches || 0}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Runs</p>
          <p className="font-score text-3xl text-accent">{batting.runs || 0}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Wickets</p>
          <p className="font-score text-3xl text-accent">{bowling.wickets || 0}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">High Score</p>
          <p className="font-score text-3xl text-white">{batting.highestScore || 0}</p>
        </div>
      </div>

      {/* Stats Tables */}
      <div className="space-y-6">
        {/* Batting Stats */}
        <StatsTable
          title="Batting Statistics"
          headers={['Format', 'Mat', 'Inn', 'Runs', 'Avg', 'SR', '50s', '100s', 'HS', '4s', '6s']}
          rows={
            batting.formats
              ? batting.formats.map((f) => [
                  f.format,
                  f.matches || 0,
                  f.innings || 0,
                  f.runs || 0,
                  f.average?.toFixed(2) || '0.00',
                  f.strikeRate?.toFixed(2) || '0.00',
                  f.fifties || 0,
                  f.hundreds || 0,
                  f.highestScore || 0,
                  f.fours || 0,
                  f.sixes || 0,
                ])
              : [
                  [
                    'Overall',
                    batting.matches || 0,
                    batting.innings || 0,
                    batting.runs || 0,
                    batting.average?.toFixed(2) || '0.00',
                    batting.strikeRate?.toFixed(2) || '0.00',
                    batting.fifties || 0,
                    batting.hundreds || 0,
                    batting.highestScore || 0,
                    batting.fours || 0,
                    batting.sixes || 0,
                  ],
                ]
          }
        />

        {/* Bowling Stats */}
        <StatsTable
          title="Bowling Statistics"
          headers={['Format', 'Mat', 'Inn', 'Overs', 'Runs', 'Wkts', 'Avg', 'Eco', 'Best']}
          rows={
            bowling.formats
              ? bowling.formats.map((f) => [
                  f.format,
                  f.matches || 0,
                  f.innings || 0,
                  f.overs || 0,
                  f.runs || 0,
                  f.wickets || 0,
                  f.average?.toFixed(2) || '0.00',
                  f.economy?.toFixed(2) || '0.00',
                  f.best || '-',
                ])
              : [
                  [
                    'Overall',
                    bowling.matches || 0,
                    bowling.innings || 0,
                    bowling.overs || 0,
                    bowling.runs || 0,
                    bowling.wickets || 0,
                    bowling.average?.toFixed(2) || '0.00',
                    bowling.economy?.toFixed(2) || '0.00',
                    bowling.best || '-',
                  ],
                ]
          }
        />

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 bg-white/5 border-b border-white/5">
              <h3 className="font-score text-lg tracking-wider text-white">Recent Matches</h3>
            </div>
            <div className="divide-y divide-white/5">
              {recentMatches.map((m, i) => (
                <Link
                  key={m._id || i}
                  to={`/match/${m._id}`}
                  className="block px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {m.teams || `${m.teamA} vs ${m.teamB}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.date
                          ? new Date(m.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : ''}
                        {m.venue ? ` • ${m.venue}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      {m.battingScore !== undefined && (
                        <p className="font-score text-lg text-white">
                          {m.battingScore}
                          <span className="text-sm text-gray-400 font-body">({m.ballsFaced})</span>
                        </p>
                      )}
                      {m.bowlingFigures && (
                        <p className="text-sm text-accent">{m.bowlingFigures}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Back */}
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
