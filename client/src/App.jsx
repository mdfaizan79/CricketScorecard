import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import LiveScorecard from './pages/LiveScorecard';
import MatchResult from './pages/MatchResult';
import Login from './pages/admin/Login';
import MatchSetup from './pages/admin/MatchSetup';
import ScoreEntry from './pages/admin/ScoreEntry';
import SeriesList from './pages/SeriesList';
import SeriesDetail from './pages/SeriesDetail';
import PlayerProfile from './pages/PlayerProfile';
import Account from './pages/Account';
import HowItWorks from './pages/HowItWorks';

function Layout() {
  return (
    <div className="site-shell bg-gradient-navy">
      <Navbar />
      <main className="pt-20 pb-10 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/match/:id" element={<LiveScorecard />} />
        <Route path="/match/:id/result" element={<MatchResult />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/series" element={<SeriesList />} />
        <Route path="/series/:id" element={<SeriesDetail />} />
        <Route path="/player/:id" element={<PlayerProfile />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route
          path="/admin/matches/new"
          element={
            <ProtectedRoute>
              <MatchSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/matches/:id/score"
          element={
            <ProtectedRoute>
              <ScoreEntry />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
