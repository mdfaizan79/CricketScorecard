import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('cricscore_reduced_motion') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
    localStorage.setItem('cricscore_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    const result = await updateProfile({ username, email });
    setSaving(false);
    setNotice(result.success ? 'Profile saved. Your account is ready for match day.' : result.message);
  };

  const initials = (user?.username || user?.email || 'C').slice(0, 1).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 page-enter">
      <div className="account-banner glass-card relative overflow-hidden p-7 md:p-10 mb-6">
        <div className="account-orb account-orb-one" /><div className="account-orb account-orb-two" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="account-avatar">{initials}</div>
          <div>
            <p className="section-eyebrow mb-3">Member clubhouse</p>
            <h1 className="font-score text-4xl md:text-5xl tracking-[0.06em]">{user?.username || 'Your account'}</h1>
            <p className="text-slate-300 mt-2">Manage your CricScore identity and viewing experience.</p>
          </div>
          <div className="md:ml-auto account-role"><span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> {user?.role || 'viewer'} access</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-6">
        <form onSubmit={save} className="glass-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-6"><div><h2 className="font-score text-2xl tracking-wider">Profile details</h2><p className="text-sm text-slate-400 mt-1">This is how your account appears in the command center.</p></div><span className="text-xl">✦</span></div>
          <div className="space-y-5">
            <label className="block text-sm font-medium text-slate-200">Display name<input value={username} onChange={(e) => setUsername(e.target.value)} className="account-input mt-2" required /></label>
            <label className="block text-sm font-medium text-slate-200">Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="account-input mt-2" required /></label>
          </div>
          {notice && <p className={`mt-5 text-sm ${notice.startsWith('Profile') ? 'text-accent' : 'text-red-300'}`}>{notice}</p>}
          <div className="mt-7 flex gap-3"><button disabled={saving} className="premium-button disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button><Link to="/" className="px-5 py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5">Back to scores</Link></div>
        </form>

        <div className="space-y-6">
          <div className="glass-card p-6"><p className="text-[11px] uppercase tracking-[.18em] text-slate-500 font-bold">Experience</p><h2 className="font-score text-2xl tracking-wider mt-2">Viewing preferences</h2><label className="flex items-center justify-between gap-4 mt-5 cursor-pointer"><span><span className="block text-sm font-semibold">Reduced motion</span><span className="block text-xs text-slate-400 mt-1">Minimize ambient and celebration animations.</span></span><input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} className="accent-toggle" /></label></div>
          <div className="glass-card p-6 border-accent/15"><p className="text-[11px] uppercase tracking-[.18em] text-accent font-bold">Match-day status</p><p className="font-score text-3xl tracking-wider mt-2">ALL SYSTEMS LIVE</p><p className="text-sm text-slate-400 mt-2">Your profile is connected to the live scoring desk.</p></div>
        </div>
      </div>
    </div>
  );
}
