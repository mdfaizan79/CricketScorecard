import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function SeriesDetail() {
  const { id } = useParams();
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await api.get(`/series/${id}`);
        setSeries(res.data.series || res.data);
      } catch (err) {
        console.error('Failed to fetch series:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-gray-400">Loading series...</p>
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="font-score text-3xl text-white mb-4">Series Not Found</h2>
        <Link to="/series" className="text-accent hover:underline">Back to Series</Link>
      </div>
    );
  }

  const pointsTable = series.pointsTable || [];
  const matches = series.matches || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 page-enter">
      {/* Header */}
      <div className="glass-card p-6 md:p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-score text-3xl md:text-4xl tracking-wider text-white mb-2">
              {series.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              {series.format && <span>{series.format}</span>}
              {series.startDate && (
                <span>
                  {new Date(series.startDate).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                  {series.endDate && ` - ${new Date(series.endDate).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}`}
                </span>
              )}
            </div>
          </div>
          <span
            className={`live-badge ${
              series.status === 'ongoing' ? 'live-badge-live' :
              series.status === 'upcoming' ? 'live-badge-upcoming' :
              'live-badge-completed'
            }`}
          >
            {series.status === 'ongoing' && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
            )}
            {series.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Points Table */}
      {pointsTable.length > 0 && (
        <div className="glass-card overflow-hidden mb-8">
          <div className="px-4 py-3 bg-white/5 border-b border-white/5">
            <h2 className="font-score text-xl tracking-wider text-white">Points Table</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Team</th>
                  <th className="text-center px-3 py-3">P</th>
                  <th className="text-center px-3 py-3">W</th>
                  <th className="text-center px-3 py-3">L</th>
                  <th className="text-center px-3 py-3">T</th>
                  <th className="text-center px-3 py-3">NR</th>
                  <th className="text-center px-3 py-3">Pts</th>
                  <th className="text-center px-3 py-3">NRR</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      i < 2 ? 'bg-accent/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-[10px] font-bold">
                          {row.shortName?.charAt(0) || row.team?.charAt(0) || '?'}
                        </div>
                        <span className="text-white font-medium">{row.team || row.shortName}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 text-gray-400">{row.played || 0}</td>
                    <td className="text-center px-3 py-3 text-accent font-semibold">{row.won || 0}</td>
                    <td className="text-center px-3 py-3 text-gray-400">{row.lost || 0}</td>
                    <td className="text-center px-3 py-3 text-gray-400">{row.tied || 0}</td>
                    <td className="text-center px-3 py-3 text-gray-400">{row.noResult || 0}</td>
                    <td className="text-center px-3 py-3 text-white font-bold">{row.points || 0}</td>
                    <td className={`text-center px-3 py-3 font-medium ${
                      (row.nrr || 0) >= 0 ? 'text-accent' : 'text-red-400'
                    }`}>
                      {(row.nrr || 0) >= 0 ? '+' : ''}{(row.nrr || 0).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matches */}
      <div>
        <h2 className="font-score text-xl tracking-wider text-white mb-4">Matches</h2>
        {matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((m, i) => (
              <Link
                key={m._id || i}
                to={`/match/${m._id}`}
                className="block glass-card-hover p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    Match {i + 1} {m.venue ? `• ${m.venue}` : ''}
                  </span>
                  <span
                    className={`live-badge text-[10px] ${
                      m.status === 'live' ? 'live-badge-live' :
                      m.status === 'completed' ? 'live-badge-completed' :
                      'live-badge-upcoming'
                    }`}
                  >
                    {m.status === 'live' && (
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse-live" />
                    )}
                    {m.status?.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-white font-medium">
                        {m.teamA?.shortName || m.teamA?.name || 'TBA'}
                      </span>
                      {m.innings?.[0] && (
                        <span className="font-score text-lg text-white">
                          {m.innings[0].totalRuns}/{m.innings[0].totalWickets}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-white font-medium">
                        {m.teamB?.shortName || m.teamB?.name || 'TBA'}
                      </span>
                      {m.innings?.[1] && (
                        <span className="font-score text-lg text-white">
                          {m.innings[1].totalRuns}/{m.innings[1].totalWickets}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {m.result && (
                  <p className="text-sm text-accent mt-2 pt-2 border-t border-white/5">
                    {m.result}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-400">No matches in this series yet</p>
          </div>
        )}
      </div>

      {/* Back */}
      <div className="text-center mt-8">
        <Link
          to="/series"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 transition-all"
        >
          ← All Series
        </Link>
      </div>
    </div>
  );
}
