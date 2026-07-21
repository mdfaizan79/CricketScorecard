import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';
import CelebrationOverlay, { getTeamFlag } from '../components/CelebrationOverlay';

/* ─── Ball Dot Component ─── */
function BallDot({ ball }) {
  const label = ball.isWicket ? 'W' : ball.isWide ? 'WD' : ball.isNoBall ? 'NB' : String(ball.runs);
  const cls =
    ball.isWicket ? 'ball-dot-W' :
    ball.isWide ? 'ball-dot-WD' :
    ball.isNoBall ? 'ball-dot-NB' :
    ball.runs === 4 ? 'ball-dot-4' :
    ball.runs === 6 ? 'ball-dot-6' :
    ball.runs === 0 ? 'ball-dot-0' :
    'ball-dot-1';
  return <span className={cls}>{label}</span>;
}

/* ─── Mini Score Header ─── */
function MiniScoreHeader({ match, currentInnings }) {
  if (!match) return null;
  const inn = match.innings?.[currentInnings];
  const battingTeam = currentInnings === 0 ? match.teamA : match.teamB;
  const target = inn?.target || null;
  const remaining = target ? target - (inn?.totalRuns || 0) : null;

  return (
    <div className="glass-card p-4 md:p-6 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="live-badge-live">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
            LIVE
          </span>
          <span className="text-xs text-gray-400">{match.format} • {match.venue}</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            {getTeamFlag(battingTeam?.name, battingTeam?.shortName) && (
              <span className="text-2xl select-none">
                {getTeamFlag(battingTeam?.name, battingTeam?.shortName)}
              </span>
            )}
            <p className="text-sm text-slate-300 font-semibold uppercase tracking-wider">{battingTeam?.name || battingTeam?.shortName}</p>
          </div>
          <p className="font-score text-4xl md:text-5xl text-white">
            {inn?.totalRuns || 0}<span className="text-gray-400">/{inn?.totalWickets || 0}</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Overs: {inn?.oversDisplay || inn?.overs || '0.0'}
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-xs text-gray-400">
            CRR: <span className="text-white font-semibold">{inn?.currentRunRate?.toFixed(2) || '0.00'}</span>
          </div>
          {target && (
            <>
              <div className="text-xs text-gray-400">
                RRR: <span className="text-accent font-semibold">{inn?.requiredRunRate?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="text-xs text-gray-400">
                Need <span className="text-accent font-semibold">{remaining}</span> runs
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Live Tab ─── */
function LiveTab({ match, currentInnings }) {
  const inn = match.innings?.[currentInnings];
  const batsmen = inn?.currentBatsmen || [];
  const bowler = inn?.currentBowler;
  const lastBalls = inn?.recentBalls?.slice(-6) || [];
  const partnership = inn?.partnership;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Current Batsmen */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Batting</h3>
        <div className="space-y-3">
          {batsmen.length > 0 ? batsmen.map((bat, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">
                  {bat.name}
                  {bat.isStriker && <span className="text-accent ml-1">*</span>}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-score text-xl text-white">{bat.runs}</span>
                <span className="text-gray-400">({bat.balls})</span>
                <span className="text-gray-500 text-xs">
                  4s:{bat.fours || 0} 6s:{bat.sixes || 0}
                </span>
                <span className="text-accent text-xs">SR: {bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : '0.0'}</span>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 text-sm">No batsmen data</p>
          )}
        </div>
        {partnership && (
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
            Partnership: <span className="text-white font-semibold">{partnership.runs}</span> ({partnership.balls} balls)
          </div>
        )}
      </div>

      {/* Current Bowler */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bowling</h3>
        {bowler ? (
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">{bowler.name}</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">{bowler.overs}-{bowler.maidens || 0}-{bowler.runs}-{bowler.wickets}</span>
              <span className="text-accent text-xs">Eco: {bowler.economy?.toFixed?.(1) || bowler.economy || '0.0'}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No bowler data</p>
        )}
      </div>

      {/* Last 6 Balls */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">This Over</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {lastBalls.length > 0 ? lastBalls.map((ball, i) => (
            <BallDot key={i} ball={ball} />
          )) : (
            <p className="text-gray-500 text-sm">No balls bowled yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Scorecard Tab ─── */
function ScorecardTab({ match }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {match.innings?.map((inn, idx) => {
        if (!inn) return null;
        const teamName = idx === 0 ? (match.teamA?.name || 'Team A') : (match.teamB?.name || 'Team B');
        return (
          <div key={idx} className="glass-card overflow-hidden">
            <div className="px-4 py-3 bg-white/5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{teamName}</h3>
                <span className="font-score text-xl text-white">
                  {inn.totalRuns}/{inn.totalWickets}
                  <span className="text-sm text-gray-400 font-body ml-1">({inn.oversDisplay || inn.overs} ov)</span>
                </span>
              </div>
            </div>

            {/* Batting Table */}
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
                        <div>
                          <Link to={`/player/${bat.playerId || i}`} className="text-white font-medium hover:text-accent transition-colors">
                            {bat.name}
                          </Link>
                          {bat.dismissal && (
                            <p className="text-xs text-gray-500 mt-0.5">{bat.dismissal}</p>
                          )}
                        </div>
                      </td>
                      <td className="text-center px-2 py-2 font-semibold text-white">{bat.runs}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bat.balls}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bat.fours || 0}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bat.sixes || 0}</td>
                      <td className="text-center px-2 py-2 text-accent">
                        {bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  )) || (
                    <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-500">No batting data</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Extras & Total */}
            <div className="px-4 py-2 border-t border-white/5 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Extras</span>
                <span className="text-white">{inn.extras || 0} (wd {inn.wides || 0}, nb {inn.noBalls || 0}, b {inn.byes || 0}, lb {inn.legByes || 0})</span>
              </div>
            </div>

            {/* Bowling Table */}
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
                      <td className="px-4 py-2">
                        <Link to={`/player/${bowl.playerId || i}`} className="text-white font-medium hover:text-accent transition-colors">
                          {bowl.name}
                        </Link>
                      </td>
                      <td className="text-center px-2 py-2 text-gray-400">{bowl.overs}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bowl.maidens || 0}</td>
                      <td className="text-center px-2 py-2 text-gray-400">{bowl.runs}</td>
                      <td className="text-center px-2 py-2 font-semibold text-white">{bowl.wickets}</td>
                      <td className="text-center px-2 py-2 text-accent">
                        {bowl.economy?.toFixed?.(1) || bowl.economy || '0.0'}
                      </td>
                    </tr>
                  )) || (
                    <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-500">No bowling data</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Fall of Wickets */}
            {inn.fallOfWickets?.length > 0 && (
              <div className="px-4 py-3 border-t border-white/5">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fall of Wickets</h4>
                <div className="flex flex-wrap gap-2">
                  {inn.fallOfWickets.map((fow, i) => (
                    <span key={i} className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {fow.runs}/{fow.wicket} ({fow.player}, {fow.overs} ov)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Overs Tab ─── */
function OversTab({ match, currentInnings }) {
  const inn = match.innings?.[currentInnings];
  const overs = inn?.overHistory || [];

  return (
    <div className="space-y-3 animate-fade-in">
      {overs.length > 0 ? overs.map((over, idx) => (
        <div key={idx} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Over {over.overNumber || idx + 1}</span>
            <span className="text-sm text-gray-400">{over.bowler || 'Unknown'}</span>
            <span className="font-score text-lg text-accent">{over.runs} runs</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {over.balls?.map((ball, i) => (
              <BallDot key={i} ball={ball} />
            ))}
          </div>
        </div>
      )) : (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-400">No over data available</p>
        </div>
      )}
    </div>
  );
}

/* ─── Commentary Tab ─── */
function CommentaryTab({ match, currentInnings }) {
  const inn = match.innings?.[currentInnings];
  const commentary = inn?.commentary || [];

  return (
    <div className="space-y-2 animate-fade-in">
      {commentary.length > 0 ? commentary.slice().reverse().map((item, idx) => (
        <div key={idx} className={`glass-card p-4 ${
          item.isWicket ? 'border-l-2 border-l-red-500' :
          item.runs === 4 ? 'border-l-2 border-l-accent' :
          item.runs === 6 ? 'border-l-2 border-l-accent' : ''
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 font-mono whitespace-nowrap mt-0.5">
              {item.over}
            </span>
            <div>
              <p className="text-sm text-white">{item.text}</p>
              {item.runs > 0 && (
                <span className={`text-xs font-semibold ${item.runs >= 4 ? 'text-accent' : 'text-gray-400'}`}>
                  {item.runs} run{item.runs > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )) : (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-400">No commentary available</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main LiveScorecard Page ─── */
export default function LiveScorecard() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [flashClass, setFlashClass] = useState('');
  const [currentInnings, setCurrentInnings] = useState(0);

  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await api.get(`/matches/${id}`);
        const data = res.data.match || res.data;
        setMatch(data);
        setCurrentInnings(data.currentInnings || 0);
      } catch (err) {
        console.error('Failed to fetch match:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [id]);

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'ball_update' || data.type === 'score_update') {
      setMatch((prev) => prev ? { ...prev, ...data.match } : prev);
      if (data.runs === 4) {
        setCelebration('four');
        setFlashClass('flash-boundary');
        setTimeout(() => setFlashClass(''), 800);
      } else if (data.runs === 6) {
        setCelebration('six');
        setFlashClass('flash-six');
        setTimeout(() => setFlashClass(''), 1000);
      } else if (data.isWicket) {
        setCelebration('wicket');
        setFlashClass('flash-wicket');
        setTimeout(() => setFlashClass(''), 600);
      }
    }
    if (data.type === 'innings_change') {
      setCurrentInnings(data.innings);
    }
  }, []);

  const { isConnected } = useWebSocket(id, handleWsMessage);

  const tabs = [
    { id: 'live', label: 'LIVE' },
    { id: 'scorecard', label: 'SCORECARD' },
    { id: 'overs', label: 'OVERS' },
    { id: 'commentary', label: 'COMMENTARY' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-gray-400">Loading scorecard...</p>
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

  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 page-enter ${flashClass}`}>
      {/* Score Header */}
      <MiniScoreHeader match={match} currentInnings={currentInnings} />

      {/* Connection Indicator */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent animate-pulse' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Reconnecting...'}</span>
      </div>

      {/* Innings Toggle (if 2 innings) */}
      {match.innings?.some(Boolean) && match.innings.filter(Boolean).length > 1 && (
        <div className="flex gap-2 mb-4">
          {match.innings.map((inn, idx) => inn ? (
            <button
              key={idx}
              onClick={() => setCurrentInnings(idx)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentInnings === idx
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              {idx === 0 ? match.teamA?.shortName || 'Inn 1' : match.teamB?.shortName || 'Inn 2'}
            </button>
          ) : null)}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-navy-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-accent/10 text-accent shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'live' && <LiveTab match={match} currentInnings={currentInnings} />}
      {activeTab === 'scorecard' && <ScorecardTab match={match} />}
      {activeTab === 'overs' && <OversTab match={match} currentInnings={currentInnings} />}
      {activeTab === 'commentary' && <CommentaryTab match={match} currentInnings={currentInnings} />}

      {/* Full-Screen Celebration Overlay */}
      {celebration && (
        <CelebrationOverlay type={celebration} onClose={() => setCelebration(null)} />
      )}
    </div>
  );
}
