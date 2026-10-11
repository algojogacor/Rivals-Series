'use client';

import React, { useEffect, useState } from 'react';

export function AmbientSpotlight() {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Only run on desktop with pointer fine
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;

    let rafId: number;
    let targetX = -500;
    let targetY = -500;
    let currX = -500;
    let currY = -500;

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const update = () => {
      currX += (targetX - currX) * 0.15;
      currY += (targetY - currY) * 0.15;
      setCoords({ x: Math.round(currX), y: Math.round(currY) });
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    rafId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!coords) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-300 hidden lg:block"
      style={{
        background: `radial-gradient(600px circle at ${coords.x}px ${coords.y}px, rgba(62, 201, 230, 0.04), rgba(167, 139, 250, 0.03), transparent 70%)`,
      }}
      aria-hidden="true"
    />
  );
}
