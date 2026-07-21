import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/series', label: 'Series' },
    { to: '/how-it-works', label: 'How it works' },
  ];

  if (isAuthenticated && user?.role === 'admin') {
    navLinks.push({ to: '/admin/matches/new', label: 'Admin' });
  }
  if (isAuthenticated) {
    navLinks.push({ to: '/account', label: 'Account' });
  }

  const displayName = user?.username || user?.email || 'Scorer';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-900/20 via-emerald-400/5 to-sky-500/10" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300/35 to-emerald-500/15 border border-emerald-300/35 shadow-lg shadow-emerald-500/20 text-lg">
              🏏
            </span>
            <div>
              <p className="font-score text-2xl tracking-[0.06em] leading-none text-white group-hover:text-emerald-200">
                Cric<span className="text-accent">Score</span>
              </p>
              <p className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Match Command Center
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/5">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-full text-sm font-semibold tracking-wide ${
                    isActive(link.to)
                      ? 'bg-emerald-400/15 text-accent border border-emerald-300/35 shadow-[0_0_0_1px_rgba(0,255,135,0.2)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Switch theme">
              <span>{theme === 'dark' ? '☀' : '☾'}</span><span className="hidden lg:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/account" className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs text-slate-300 max-w-[180px] hover:border-accent/35">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/70 to-sky-400/70 text-navy-950 font-black flex items-center justify-center">{displayName.charAt(0).toUpperCase()}</span>
                  <span className="truncate pr-1">{displayName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full text-sm font-semibold border border-red-300/25 text-red-300 bg-red-400/10 hover:bg-red-400/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-emerald-400/25 to-sky-400/20 border border-emerald-200/35 text-emerald-100 hover:from-emerald-400/35 hover:to-sky-400/30"
              >
                Admin Login
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="md:hidden p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl">
          <div className="px-4 pt-3 pb-5 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block px-4 py-3 rounded-xl text-sm font-semibold ${
                  isActive(link.to)
                    ? 'bg-emerald-400/15 text-accent border border-emerald-300/35'
                    : 'text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-2 mt-2 border-t border-white/10">
              <button onClick={toggleTheme} className="theme-toggle w-full justify-center mb-3"><span>{theme === 'dark' ? '☀' : '☾'}</span> {theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
              {isAuthenticated ? (
                <>
                  <div className="px-3 pb-2 text-xs text-slate-400 truncate">Signed in as {displayName}</div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-red-300 border border-red-400/25 bg-red-500/10 hover:bg-red-500/20"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/admin/login"
                  className="block px-4 py-3 rounded-xl text-sm font-semibold text-emerald-100 border border-emerald-200/30 bg-gradient-to-r from-emerald-400/20 to-sky-400/15"
                >
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
