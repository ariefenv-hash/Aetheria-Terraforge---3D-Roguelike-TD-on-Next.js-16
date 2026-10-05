'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Three.js + WebGL need the browser. Load AetheriaApp only on the client.
const AetheriaApp = dynamic(() => import('@/components/game/AetheriaApp'), {
  ssr: false,
  loading: () => <AetheriaSplash />,
});

export default function Home() {
  // Track whether the Aetheria theme class has been applied to <body>.
  const [themed, setThemed] = useState(false);

  useEffect(() => {
    document.body.classList.add('aetheria-root');
    setThemed(true);
    return () => {
      document.body.classList.remove('aetheria-root');
    };
  }, []);

  // Wait until the body has been themed before mounting the WebGL app. This
  // also doubles as a client-mount gate so we never try to render <canvas>
  // during SSR.
  if (!themed) return <AetheriaSplash />;

  return <AetheriaApp />;
}

/**
 * Decorative medieval loading splash shown before the WebGL canvas mounts.
 */
function AetheriaSplash() {
  return (
    <div className="aetheria-splash fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#d4a857]/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-[#962828]/15 blur-3xl animate-pulse [animation-delay:1s]" />
      </div>
      <div className="relative text-center px-6">
        <div className="font-cinzel text-[#d6af68] tracking-[0.3em] text-xs uppercase mb-3">
          Aetheria Studio
        </div>
        <h1 className="font-decorative text-5xl md:text-7xl font-bold text-[#f7e7c4] drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] mb-4">
          Terraforge
        </h1>
        <div className="font-script text-base md:text-lg text-[#ebdcb9]/80 italic mb-8">
          以大地为砧，铸就命运之塔
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[#d6af68] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <div className="font-cinzel text-[10px] text-[#7c6241] uppercase tracking-widest">
          唤醒古卷·构筑防线
        </div>
      </div>
    </div>
  );
}
