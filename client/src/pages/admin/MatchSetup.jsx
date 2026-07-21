import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

function PlayerEntry({ player, index, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 animate-fade-in">
      <span className="text-xs text-gray-500 w-5 shrink-0">{index + 1}</span>
      <input
        type="text"
        value={player.name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
        placeholder="Player name"
        className="flex-1 px-3 py-2 rounded-lg bg-navy-800 border border-white/10 text-white text-sm placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
      />
      <select
        value={player.role}
        onChange={(e) => onChange(index, 'role', e.target.value)}
        className="px-3 py-2 rounded-lg bg-navy-800 border border-white/10 text-white text-sm focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <input
        type="number"
        value={player.jerseyNumber ?? ''}
        onChange={(e) => onChange(index, 'jerseyNumber', e.target.value)}
        placeholder="#"
        min="0"
        max="999"
        aria-label={`${player.name || 'Player'} jersey number`}
        className="w-14 px-2 py-2 rounded-lg bg-navy-800 border border-white/10 text-white text-sm text-center placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function TeamSection({ label, color, team, setTeam, players, setPlayers }) {
  const handlePlayerChange = (index, field, value) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const addPlayer = () => {
    if (players.length < 11) {
      setPlayers([...players, { name: '', role: 'Batsman', jerseyNumber: '' }]);
    }
  };

  const removePlayer = (index) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <h3 className="font-score text-xl tracking-wider text-white">{label}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Team Name</label>
          <input
            type="text"
            value={team.name}
            onChange={(e) => setTeam({ ...team, name: e.target.value })}
            placeholder="e.g., India"
            className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Short Name</label>
          <input
            type="text"
            value={team.shortName}
            onChange={(e) => setTeam({ ...team, shortName: e.target.value.toUpperCase() })}
            placeholder="e.g., IND"
            maxLength={5}
            className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all uppercase"
            required
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300">
            Players ({players.length}/11)
          </label>
          {players.length < 11 && (
            <button
              type="button"
              onClick={addPlayer}
              className="text-xs text-accent hover:text-accent-400 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Player
            </button>
          )}
        </div>
        <div className="space-y-2">
          {players.map((player, i) => (
            <PlayerEntry
              key={i}
              player={player}
              index={i}
              onChange={handlePlayerChange}
              onRemove={removePlayer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MatchSetup() {
  const navigate = useNavigate();
  const [format, setFormat] = useState('T20');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [teamA, setTeamA] = useState({ name: '', shortName: '' });
  const [teamB, setTeamB] = useState({ name: '', shortName: '' });
  const [playersA, setPlayersA] = useState(
    Array.from({ length: 11 }, () => ({ name: '', role: 'Batsman' }))
  );
  const [playersB, setPlayersB] = useState(
    Array.from({ length: 11 }, () => ({ name: '', role: 'Batsman' }))
  );
  const [tossWinner, setTossWinner] = useState('teamA');
  const [tossDecision, setTossDecision] = useState('bat');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validPlayersA = playersA.filter((p) => p.name.trim());
    const validPlayersB = playersB.filter((p) => p.name.trim());

    if (validPlayersA.length < 2 || validPlayersB.length < 2) {
      setError('Each team needs at least 2 players');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        format,
        venue,
        date: date || undefined,
        teamA: { ...teamA, players: validPlayersA },
        teamB: { ...teamB, players: validPlayersB },
        toss: {
          winner: tossWinner,
          decision: tossDecision,
        },
      };

      const res = await api.post('/matches', payload);
      const matchId = res.data.match?._id || res.data._id;
      navigate(`/admin/matches/${matchId}/score`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create match');
    } finally {
      setSubmitting(false);
    }
  };

  const formats = ['T20', 'ODI', 'Test'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <div className="text-center mb-8">
        <h1 className="font-score text-4xl tracking-wider text-white">New Match</h1>
        <p className="text-gray-400 mt-2">Setup teams and start scoring</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Format Selector */}
        <div className="glass-card p-5 md:p-6">
          <h3 className="font-score text-xl tracking-wider text-white mb-4">Match Format</h3>
          <div className="grid grid-cols-3 gap-3">
            {formats.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`py-4 rounded-xl font-score text-xl tracking-wider transition-all duration-200 ${
                  format === f
                    ? 'bg-accent/15 text-accent border-2 border-accent/40 shadow-lg shadow-accent/10'
                    : 'bg-navy-800 text-gray-400 border-2 border-white/5 hover:border-white/15 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Venue & Date */}
        <div className="glass-card p-5 md:p-6">
          <h3 className="font-score text-xl tracking-wider text-white mb-4">Match Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Venue</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g., Wankhede Stadium, Mumbai"
                className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Date & Time</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-white/10 text-white focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Team A */}
        <TeamSection
          label="Team A"
          color="bg-blue-500"
          team={teamA}
          setTeam={setTeamA}
          players={playersA}
          setPlayers={setPlayersA}
        />

        {/* Team B */}
        <TeamSection
          label="Team B"
          color="bg-orange-500"
          team={teamB}
          setTeam={setTeamB}
          players={playersB}
          setPlayers={setPlayersB}
        />

        {/* Toss */}
        <div className="glass-card p-5 md:p-6">
          <h3 className="font-score text-xl tracking-wider text-white mb-4">Toss</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Toss Won By</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossWinner('teamA')}
                  className={`py-3 rounded-lg text-sm font-medium transition-all ${
                    tossWinner === 'teamA'
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-navy-800 text-gray-400 border border-white/10 hover:bg-white/5'
                  }`}
                >
                  {teamA.shortName || 'Team A'}
                </button>
                <button
                  type="button"
                  onClick={() => setTossWinner('teamB')}
                  className={`py-3 rounded-lg text-sm font-medium transition-all ${
                    tossWinner === 'teamB'
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-navy-800 text-gray-400 border border-white/10 hover:bg-white/5'
                  }`}
                >
                  {teamB.shortName || 'Team B'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Chose to</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossDecision('bat')}
                  className={`py-3 rounded-lg text-sm font-medium transition-all ${
                    tossDecision === 'bat'
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-navy-800 text-gray-400 border border-white/10 hover:bg-white/5'
                  }`}
                >
                  🏏 Bat
                </button>
                <button
                  type="button"
                  onClick={() => setTossDecision('bowl')}
                  className={`py-3 rounded-lg text-sm font-medium transition-all ${
                    tossDecision === 'bowl'
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-navy-800 text-gray-400 border border-white/10 hover:bg-white/5'
                  }`}
                >
                  🎯 Bowl
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !teamA.name || !teamB.name}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 text-navy-950 font-bold text-lg hover:from-accent-400 hover:to-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
              Creating Match...
            </span>
          ) : (
            'Create Match & Start Scoring →'
          )}
        </button>
      </form>
    </div>
  );
}
