import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';
import { getTeamFlag } from '../components/CelebrationOverlay';
import cricketHero from '../assets/cricket-hero.png';

function formatMatchDate(dateValue) {
  if (!dateValue) return 'Date TBD';
  return new Date(dateValue).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ─── Modern Stat Tile ─── */
function StatTile({ label, value, tone = 'default', icon }) {
  const glowStyle =
    tone === 'alert'
      ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)] text-red-400'
      : tone === 'accent'
        ? 'border-accent/30 shadow-[0_0_15px_rgba(0,255,135,0.08)] text-accent'
        : 'border-white/10 text-white';

  return (
    <div className={`glass-card p-5 text-left border transition-all duration-300 hover:scale-[1.03] hover:border-white/25 flex items-center justify-between ${glowStyle}`}>
      <div>
        <p className="font-score text-4xl leading-none font-black">{value}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">{label}</p>
      </div>
      <span className="text-3xl opacity-75">{icon}</span>
    </div>
  );
}

/* ─── Compact Team Score Row ─── */
function TeamScoreRow({ team, innings, gradient }) {
  const flag = getTeamFlag(team?.name, team?.shortName);

  return (
    <div className="flex items-center justify-between py-3 px-2 rounded-xl transition-all duration-200 hover:bg-white/5">
      <div className="flex items-center gap-3 min-w-0">
        {flag ? (
          <span className="text-2xl w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-md select-none">
            {flag}
          </span>
        ) : (
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold text-white shadow-md`}>
            {team?.shortName?.charAt(0) || team?.name?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-white truncate text-sm md:text-base">{team?.name || 'Team'}</span>
          {team?.shortName && <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{team.shortName}</span>}
        </div>
      </div>

      <div className="text-right ml-4 shrink-0">
        {innings ? (
          <p className="font-score text-xl md:text-2xl leading-none text-white font-bold">
            {innings.totalRuns ?? 0}
            <span className="text-slate-400 text-sm md:text-lg">/{innings.totalWickets ?? 0}</span>
            <span className="ml-1.5 font-body text-[10px] md:text-xs text-slate-400">
              ({innings.oversDisplay || innings.overs || '0.0'} ov)
            </span>
          </p>
        ) : (
          <p className="text-xs text-slate-500 font-medium italic">Yet to bat</p>
        )}
      </div>
    </div>
  );
}

/* ─── Dynamic Live Match Card ─── */
function LiveMatchCard({ match }) {
  const [matchData, setMatchData] = useState(match);
  const [flashClass, setFlashClass] = useState('');

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'ball_update' || data.type === 'score_update') {
      setMatchData((prev) => ({ ...prev, ...data.match }));
      if (data.runs === 4) {
        setFlashClass('flash-boundary');
        setTimeout(() => setFlashClass(''), 800);
      } else if (data.runs === 6) {
        setFlashClass('flash-six');
        setTimeout(() => setFlashClass(''), 1000);
      } else if (data.isWicket) {
        setFlashClass('flash-wicket');
        setTimeout(() => setFlashClass(''), 600);
      }
    }
  }, []);

  const { isConnected } = useWebSocket(match.status === 'live' ? match._id : null, handleWsMessage);

  const m = matchData;
  const innings1 = m.innings?.[0];
  const innings2 = m.innings?.[1];
  const currentInnings = m.innings?.[m.currentInnings] || innings1;
  const target = currentInnings?.target || null;

  const isLive = m.status === 'live';

  return (
    <Link
      to={`/match/${m._id}`}
      className={`group block glass-card-hover p-6 border transition-all duration-300 relative overflow-hidden ${
        isLive
          ? 'border-red-500/25 animate-live-ring shadow-lg shadow-red-500/5 hover:border-red-500/50'
          : 'border-white/10 hover:border-accent/40'
      } ${flashClass}`}
    >
      {/* Background glow for Live matches */}
      {isLive && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none -z-10" />
      )}

      {/* Header metadata */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300">
            {m.format || 'Match'}
          </span>
          <p className="text-xs text-slate-400 mt-2 font-medium">{m.venue || 'Venue TBD'}</p>
        </div>

        {isLive ? (
          <span className="live-badge-live shadow-md shadow-red-500/10">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
            LIVE
          </span>
        ) : m.status === 'upcoming' ? (
          <span className="live-badge-upcoming">Upcoming</span>
        ) : (
          <span className="live-badge-completed">Final</span>
        )}
      </div>

      {/* Scores Area */}
      <div className="space-y-2">
        <TeamScoreRow team={m.teamA} innings={innings1} gradient="from-sky-400 to-indigo-600" />
        <div className="soft-divider opacity-50" />
        <TeamScoreRow team={m.teamB} innings={innings2} gradient="from-amber-400 to-rose-600" />
      </div>

      {/* Footer / Commentary indicator */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
        {m.result ? (
          <p className="font-semibold text-accent leading-none">{m.result}</p>
        ) : isLive ? (
          <>
            <p className="text-slate-400 font-medium">
              CRR <span className="text-white font-semibold">{currentInnings?.currentRunRate?.toFixed(2) || '0.00'}</span>
              {target && currentInnings?.requiredRunRate
                ? ` • RRR ${currentInnings.requiredRunRate.toFixed(2)}`
                : ''}
              {target
                ? ` • Need ${Math.max(0, target - (currentInnings?.totalRuns || 0))}`
                : ''}
            </p>

            {/* Over log directly on dashboard */}
            {currentInnings?.recentBalls?.length > 0 ? (
              <div className="flex gap-1 items-center">
                {currentInnings.recentBalls.slice(-4).map((ball, idx) => (
                  <span
                    key={idx}
                    className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm ${
                      ball.isWicket ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                      ball.isWide || ball.isNoBall ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                      ball.runs === 4 || ball.runs === 6 ? 'bg-emerald-500/20 text-accent border border-emerald-500/40' :
                      'bg-slate-700/50 text-slate-300 border border-white/5'
                    }`}
                  >
                    {ball.isWicket ? 'W' : ball.isWide ? 'WD' : ball.isNoBall ? 'NB' : ball.runs}
                  </span>
                ))}
              </div>
            ) : (
              isConnected && (
                <span className="inline-flex items-center gap-1.5 text-accent/80 font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                  Live Feed
                </span>
              )
            )}
          </>
        ) : (
          <p className="text-slate-400 font-medium">{formatMatchDate(m.date)}</p>
        )}
      </div>
    </Link>
  );
}

/* ─── Match Category List ─── */
function MatchSection({ title, subtitle, badge, matches, emptyMessage }) {
  return (
    <section className="mb-12 page-enter">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-score text-3xl tracking-[0.04em] text-white font-extrabold flex items-center gap-2">
            {title}
            {badge && <div className="shrink-0">{badge}</div>}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>

      {matches && matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <LiveMatchCard key={match._id} match={match} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-slate-400 border border-white/5">
          <span className="text-3xl block mb-2">🏏</span>
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

/* ─── Main Redesigned Dashboard Page ─── */
export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/matches');
        setMatches(res.data.matches || res.data || []);
      } catch (err) {
        console.error('Failed to fetch matches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  // Filtering Logic
  const filteredMatches = matches.filter((m) => {
    const formatMatch = selectedFormat === 'All' || m.format === selectedFormat;
    const categoryMatch =
      activeCategory === 'All' ||
      (activeCategory === 'Live' && m.status === 'live') ||
      (activeCategory === 'Upcoming' && m.status === 'upcoming') ||
      (activeCategory === 'Completed' && m.status === 'completed');
    return formatMatch && categoryMatch;
  });

  const liveMatches = filteredMatches.filter((m) => m.status === 'live');
  const upcomingMatches = filteredMatches.filter((m) => m.status === 'upcoming');
  const recentMatches = filteredMatches.filter((m) => m.status === 'completed');

  // Stats derived from raw list
  const totalLive = matches.filter((m) => m.status === 'live').length;
  const totalUpcoming = matches.filter((m) => m.status === 'upcoming').length;
  const totalCompleted = matches.filter((m) => m.status === 'completed').length;

  const formats = ['All', 'T20', 'ODI', 'Test'];
  const categories = [
    { id: 'All', label: 'All Fixtures' },
    { id: 'Live', label: 'Live Now' },
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'Completed', label: 'Completed' },
  ];

  const hasFeatured = matches.length > 0;
  const featuredMatch = matches.find((m) => m.status === 'live') || matches[0];

  return (
    <div className="space-y-6">
      {/* ─── Hero Billboard ─── */}
      <section className="relative overflow-hidden pt-4 pb-6">
        {/* Colorful backdrop ambient blur circles */}
        <div className="absolute top-12 left-1/4 w-[350px] h-[350px] rounded-full bg-emerald-500/10 blur-[90px] -z-10 animate-pulse-live" />
        <div className="absolute bottom-6 right-1/4 w-[280px] h-[280px] rounded-full bg-sky-500/8 blur-[90px] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-8 items-stretch">
            {/* Jumbotron Card */}
            <div className="hero-stage glass-card p-8 md:p-10 border border-white/10 flex flex-col justify-between relative overflow-hidden min-h-[390px]">
              <img src={cricketHero} alt="Cricket batter hitting a lofted shot under stadium lights" className="hero-stage-media" />
              <div className="hero-stage-shade" />
              
              <div className="relative z-10">
                <span className="section-eyebrow mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  Cricket Scorecard
                </span>

                <h1 className="font-score text-[3.8rem] leading-[0.88] md:text-[5rem] tracking-[0.06em] text-white font-black mt-4">
                  Live Action. <br />
                  <span className="text-gradient">Real-Time Speed.</span>
                </h1>

                <p className="mt-6 text-sm md:text-base text-slate-300 max-w-xl leading-relaxed">
                  Track dynamic updates, scores, commentary logs, and tournament standings in a dashboard designed for cricket enthusiasts.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                {featuredMatch ? (
                  <Link
                    to={`/match/${featuredMatch._id}`}
                    className="px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-accent to-emerald-400 text-navy-950 shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Open Featured Match
                  </Link>
                ) : (
                  <Link
                    to="/series"
                    className="px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-accent to-emerald-400 text-navy-950 shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Explore Series
                  </Link>
                )}
                <Link
                  to="/series"
                  className="px-6 py-3.5 rounded-xl text-sm font-bold border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                >
                  Fixtures Calendar
                </Link>
              </div>
            </div>

            {/* Quick Stat Tiles column */}
            <div className="flex flex-col justify-between gap-4">
              <StatTile label="Live Matches" value={totalLive} tone="alert" icon="🔴" />
              <StatTile label="Upcoming Games" value={totalUpcoming} tone="accent" icon="📅" />
              <StatTile label="Recent Results" value={totalCompleted} icon="🏆" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Filters Navigation Bar ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="glass-card p-3 border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Format Selection (Pill button group) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {formats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                  selectedFormat === fmt
                    ? 'bg-accent/15 text-accent border border-accent/40 shadow-sm shadow-accent/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                  activeCategory === cat.id
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Match Lists ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="glass-card px-8 py-6 text-center border border-white/5">
              <div className="w-10 h-10 mx-auto border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-slate-400">Syncing scoreboard fixtures...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(activeCategory === 'All' || activeCategory === 'Live') && (
              <MatchSection
                title="Live Matches"
                subtitle="Ball-by-ball scoreboards streaming updates in real-time"
                badge={
                  liveMatches.length > 0 ? (
                    <span className="live-badge-live">
                      <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-ping" />
                      {liveMatches.length} Active
                    </span>
                  ) : null
                }
                matches={liveMatches}
                emptyMessage="No live games currently active. Check upcoming listings."
              />
            )}

            {(activeCategory === 'All' || activeCategory === 'Upcoming') && (
              <MatchSection
                title="Upcoming Matches"
                subtitle="Scheduled fixtures starting soon"
                matches={upcomingMatches}
                emptyMessage="No upcoming matches are scheduled."
              />
            )}

            {(activeCategory === 'All' || activeCategory === 'Completed') && (
              <MatchSection
                title="Recent Results"
                subtitle="Outcome details and historical performance scorecards"
                matches={recentMatches}
                emptyMessage="No completed matches logged."
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
