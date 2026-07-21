import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
];

export default function SeriesList() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await api.get('/series');
        setSeries(res.data.series || res.data || []);
      } catch (err) {
        console.error('Failed to fetch series:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, []);

  const filtered = filter === 'all'
    ? series
    : series.filter((s) => s.status === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 page-enter">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-score text-4xl md:text-5xl tracking-wider text-white mb-2">
          Cricket <span className="text-gradient">Series</span>
        </h1>
        <p className="text-gray-400">Browse all tournaments and series</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 justify-center flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === f.value
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Series List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-gray-400">Loading series...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <span className="text-4xl mb-4 block">🏏</span>
          <p className="text-gray-400 text-lg">No series found</p>
          <p className="text-gray-500 text-sm mt-1">
            {filter !== 'all' ? 'Try changing the filter' : 'Check back later for upcoming series'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <Link
              key={s._id}
              to={`/series/${s._id}`}
              className="glass-card-hover p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg group-hover:text-accent transition-colors">
                    {s.name}
                  </h3>
                  {s.teams && (
                    <p className="text-sm text-gray-400 mt-1">
                      {Array.isArray(s.teams)
                        ? s.teams.map((t) => t.shortName || t.name || t).join(' • ')
                        : s.teams}
                    </p>
                  )}
                </div>
                <span className={`live-badge ${
                  s.status === 'ongoing' ? 'live-badge-live' :
                  s.status === 'upcoming' ? 'live-badge-upcoming' :
                  'live-badge-completed'
                }`}>
                  {s.status === 'ongoing' && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
                  )}
                  {s.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                {s.format && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {s.format}
                  </span>
                )}
                {s.startDate && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {s.endDate && ` - ${new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                  </span>
                )}
                {s.totalMatches !== undefined && (
                  <span>{s.totalMatches} matches</span>
                )}
              </div>

              {/* Progress Bar for ongoing */}
              {s.status === 'ongoing' && s.totalMatches > 0 && s.completedMatches !== undefined && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{s.completedMatches} of {s.totalMatches} matches</span>
                    <span>{Math.round((s.completedMatches / s.totalMatches) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-500 to-accent rounded-full transition-all duration-500"
                      style={{ width: `${(s.completedMatches / s.totalMatches) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
