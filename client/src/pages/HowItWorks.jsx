import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import guideVisual from '../assets/how-it-works-cricket.png';

const steps = [
  { number: '01', icon: '✦', title: 'Create the fixture', copy: 'Set the teams, format, venue, players and jersey numbers in one clear setup flow.' },
  { number: '02', icon: '◉', title: 'Score every ball', copy: 'Record runs, extras and wickets from the scoring desk. The live board updates immediately.' },
  { number: '03', icon: '↗', title: 'Share the moment', copy: 'Fans get a sharp live scorecard, player records and match result from any device.' },
];

function DemoPlayer() {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const scenes = [
    { label: 'Set up a match', text: 'Add teams, players & jerseys', score: 'IND 0/0', sub: 'T20 • 0.0 ov', color: 'bg-sky-400' },
    { label: 'Capture the action', text: 'Ball-by-ball scoring is instant', score: 'IND 48/1', sub: 'T20 • 5.2 ov', color: 'bg-accent' },
    { label: 'Celebrate live', text: 'Boundaries & wickets come alive', score: 'IND 156/5', sub: 'T20 • 18.4 ov', color: 'bg-amber-300' },
  ];
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setFrame((current) => (current + 1) % scenes.length), 1900);
    return () => clearInterval(timer);
  }, [playing]);
  const scene = scenes[frame];
  return (
    <div className="demo-player">
      <div className="demo-player-top"><span className="live-badge-live"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" /> Demo</span><span className="text-xs text-slate-400">00: {String(frame * 7 + 8).padStart(2, '0')}</span></div>
      <div className="demo-pitch"><div className="demo-crease" /><div className="demo-ball" /><div className="demo-bat">🏏</div></div>
      <div className="demo-score"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{scene.label}</p><p className="font-score text-4xl tracking-wider mt-1">{scene.score}</p><p className="text-sm text-slate-400">{scene.sub}</p></div><div className={`demo-pulse ${scene.color}`} /></div>
      <p className="text-center text-sm text-slate-300 mt-5">{scene.text}</p>
      <div className="mt-5 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-accent transition-all duration-500" style={{ width: `${((frame + 1) / scenes.length) * 100}%` }} /></div>
      <button onClick={() => setPlaying((value) => !value)} className="demo-play" aria-label={playing ? 'Pause demo' : 'Play demo'}>{playing ? 'Ⅱ Pause demo' : '▶ Play demo'}</button>
    </div>
  );
}

export default function HowItWorks() {
  return <div className="page-enter">
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="guide-hero glass-card overflow-hidden relative min-h-[430px] flex items-end p-7 md:p-12">
        <img src={guideVisual} alt="Cricket scorer using live scoring on a phone at a stadium" className="guide-hero-image" />
        <div className="guide-hero-overlay" />
        <div className="relative max-w-2xl"><span className="section-eyebrow mb-5">The CricScore playbook</span><h1 className="font-score text-5xl md:text-7xl leading-[.9] tracking-[.06em]">EVERY BALL.<br /><span className="text-gradient">ONE CLEAR STORY.</span></h1><p className="mt-6 text-slate-200 max-w-xl leading-relaxed">CricScore turns a local match into a premium live experience—from the scorer’s first setup to the final ball.</p><Link to="/" className="inline-flex mt-7 premium-button">Explore live scores →</Link></div>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="grid lg:grid-cols-2 gap-8 items-center"><div><span className="section-eyebrow">Three simple moves</span><h2 className="font-score text-4xl md:text-5xl tracking-[.06em] mt-4">BUILT FOR THE<br />WHOLE MATCH DAY.</h2><p className="text-slate-400 mt-4 max-w-lg">A focused scoring flow for admins and a beautiful, real-time view for every supporter.</p><div className="mt-8 space-y-3">{steps.map((step) => <article key={step.number} className="guide-step"><span className="guide-step-number">{step.number}</span><span className="guide-step-icon">{step.icon}</span><div><h3 className="font-semibold text-white">{step.title}</h3><p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.copy}</p></div></article>)}</div></div><DemoPlayer /></div></section>

    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20"><div className="grid md:grid-cols-3 gap-4">{[['Real-time scorecards','Fresh score, wickets, over history and player stats without a page refresh.'],['Match moments','Every 4, 6 and wicket gets the right amount of on-screen energy.'],['Your way','Dark and light themes plus reduced motion respect the way you like to follow the game.']].map(([title, copy]) => <div className="glass-card p-6" key={title}><p className="text-accent text-xl">✦</p><h3 className="font-score text-2xl tracking-wider mt-4">{title}</h3><p className="text-sm text-slate-400 mt-2 leading-relaxed">{copy}</p></div>)}</div></section>
  </div>;
}
