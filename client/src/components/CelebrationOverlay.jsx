import React, { useEffect, useRef } from 'react';

/* ─── HTML5 Canvas Particle Explosion ─── */
function CelebrationCanvas({ type }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Curated neon palettes matching the event type
    let colors = [];
    if (type === 'four') {
      colors = ['#00ff87', '#34d399', '#059669', '#10b981', '#a7f3d0', '#ffffff'];
    } else if (type === 'six') {
      colors = ['#f59e0b', '#fbbf24', '#f59e0b', '#00ff87', '#38bdf8', '#8b5cf6', '#ec4899', '#ffffff'];
    } else { // wicket
      colors = ['#ef4444', '#f87171', '#dc2626', '#b91c1c', '#fca5a5', '#ff8a8a'];
    }

    class Particle {
      constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        
        // Velocity (spread in circular fashion with upwards lift)
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (type === 'six' ? 22 : 16) + 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 5; // Upward bias
        
        this.radius = Math.random() * 6 + (type === 'six' ? 4 : 3);
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.01;
        this.gravity = 0.25;
        this.rotation = Math.random() * Math.PI;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        this.alpha -= this.decay;
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        if (type === 'six') {
          // Draw star-like shapes for sixes
          ctx.moveTo(0, -this.radius);
          ctx.lineTo(this.radius * 0.3, -this.radius * 0.3);
          ctx.lineTo(this.radius, 0);
          ctx.lineTo(this.radius * 0.3, this.radius * 0.3);
          ctx.lineTo(0, this.radius);
          ctx.lineTo(-this.radius * 0.3, this.radius * 0.3);
          ctx.lineTo(-this.radius, 0);
          ctx.lineTo(-this.radius * 0.3, -this.radius * 0.3);
        } else {
          // Draw standard circles / squares
          ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        }
        
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
      }
    }

    // Spawn initial particle burst
    const particles = [];
    const count = type === 'six' ? 180 : 120;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let active = false;
      particles.forEach((p) => {
        if (p.alpha > 0) {
          p.update();
          p.draw();
          active = true;
        }
      });

      if (active) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [type]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />;
}

/* ─── Celebrations Overlay ─── */
export default function CelebrationOverlay({ type, onClose }) {
  useEffect(() => {
    // Auto-dismiss celebration after 2 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Content configurations based on type
  const config = {
    four: {
      title: 'FOUR!',
      subtitle: 'CRACKING BOUNDARY',
      glowClass: 'shadow-neon-green border-emerald-500/40 text-emerald-400',
      bgGlow: 'bg-emerald-500/10',
      titleGrad: 'from-emerald-300 via-green-400 to-emerald-300',
      shakeClass: 'animate-celebration-bounce',
    },
    six: {
      title: 'SIX!',
      subtitle: 'MASSIVE MAXIMUM',
      glowClass: 'shadow-neon-gold border-amber-500/40 text-amber-400',
      bgGlow: 'bg-amber-500/10',
      titleGrad: 'from-amber-300 via-yellow-400 to-accent-main',
      shakeClass: 'animate-celebration-shake',
    },
    wicket: {
      title: 'OUT!',
      subtitle: 'WICKET FALLS',
      glowClass: 'shadow-neon-red border-red-500/40 text-red-400',
      bgGlow: 'bg-red-500/10',
      titleGrad: 'from-red-300 via-red-500 to-rose-400',
      shakeClass: 'animate-celebration-wobble',
    },
  };

  const active = config[type] || config.four;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-none">
      {/* Dynamic Particle Canvas */}
      <CelebrationCanvas type={type} />

      {/* Radial ambient glow in the center */}
      <div className={`absolute w-[450px] h-[450px] rounded-full blur-[80px] -z-10 transition-all duration-700 ${active.bgGlow}`} />

      {/* Celebration Typography Card */}
      <div className={`relative px-8 py-10 rounded-2xl border bg-navy-950/70 backdrop-blur-lg flex flex-col items-center justify-center text-center max-w-sm w-full shadow-2xl ${active.glowClass} ${active.shakeClass}`}>
        
        {/* Animated Icon badge */}
        <div className="mb-4 w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
          {type === 'four' && (
            <svg className="w-8 h-8 text-accent-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          {type === 'six' && (
            <svg className="w-8 h-8 text-amber-400 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          )}
          {type === 'wicket' && (
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>

        {/* Text Title */}
        <h1 className={`font-score text-7xl uppercase tracking-widest font-black bg-gradient-to-r bg-clip-text text-transparent filter drop-shadow-md select-none ${active.titleGrad}`}>
          {active.title}
        </h1>

        {/* Subtext */}
        <p className="text-gray-400 font-semibold text-xs tracking-[0.2em] uppercase mt-2 select-none">
          {active.subtitle}
        </p>

        {/* Live Spark Lines */}
        <div className="flex gap-1.5 mt-5">
          <span className="w-2.5 h-1.5 rounded-full bg-white/20 animate-ping" />
          <span className="w-8 h-1.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-1.5 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

// Helper mapping country names & codes to flags
export function getTeamFlag(teamName = '', shortName = '') {
  const name = String(teamName || '').toLowerCase().trim();
  const sn = String(shortName || '').toLowerCase().trim();

  // Country flags
  if (name.includes('india') || sn === 'ind') return '🇮🇳';
  if (name.includes('australia') || sn === 'aus') return '🇦🇺';
  if (name.includes('england') || sn === 'eng') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (name.includes('pakistan') || sn === 'pak') return '🇵🇰';
  if (name.includes('south africa') || sn === 'sa' || sn === 'rsa') return '🇿🇦';
  if (name.includes('new zealand') || sn === 'nz') return '🇳🇿';
  if (name.includes('sri lanka') || sn === 'sl') return '🇱🇰';
  if (name.includes('bangladesh') || sn === 'ban') return '🇧🇩';
  if (name.includes('afghanistan') || sn === 'afg') return '🇦🇫';
  if (name.includes('west indies') || sn === 'wi') return '🌴';
  if (name.includes('zimbabwe') || sn === 'zim') return '🇿🇼';
  if (name.includes('ireland') || sn === 'ire') return '🇮🇪';
  if (name.includes('nepal') || sn === 'nep') return '🇳🇵';
  if (name.includes('netherlands') || sn === 'ned') return '🇳🇱';
  if (name.includes('scotland') || sn === 'sco') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  if (name.includes('usa') || name.includes('united states') || sn === 'usa') return '🇺🇸';
  if (name.includes('canada') || sn === 'can') return '🇨🇦';

  // Popular franchise teams mapping (IPL fallback colors)
  if (name.includes('mumbai') || sn === 'mi') return '💙';
  if (name.includes('bangalore') || name.includes('rcb') || sn === 'rcb') return '❤️';
  if (name.includes('chennai') || name.includes('super kings') || sn === 'csk') return '💛';
  if (name.includes('kolkata') || name.includes('knight riders') || sn === 'kkr') return '💜';
  if (name.includes('delhi') || sn === 'dc') return '💙';
  if (name.includes('rajasthan') || sn === 'rr') return '💖';
  if (name.includes('punjab') || sn === 'pbks') return '🔴';
  if (name.includes('hyderabad') || sn === 'srh') return '🧡';
  if (name.includes('lucknow') || sn === 'lsg') return '💚';
  if (name.includes('gujarat') || sn === 'gt') return '💎';

  return null;
}

