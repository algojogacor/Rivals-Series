import confetti from 'canvas-confetti';

/**
 * Triggers a triumphant golden confetti celebration for championships and awards.
 */
export function burstTrophyConfetti(originX = 0.5, originY = 0.6) {
  if (typeof window === 'undefined') return;

  const count = 120;
  const defaults = {
    origin: { x: originX, y: originY },
    zIndex: 9999,
    disableForReducedMotion: false,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Golden shower of stars and flakes
  fire(0.25, {
    spread: 30,
    startVelocity: 55,
    colors: ['#fbbf24', '#f59e0b', '#d97706', '#fef3c7'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#ffd700', '#fef08a', '#eab308', '#ffffff'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#f59e0b', '#fbbf24', '#fffbeb'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    shapes: ['star', 'circle'],
    colors: ['#ffd700', '#fbbf24', '#ffffff'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#eab308', '#ca8a04', '#fef08a'],
  });
}

/**
 * Triggers a dual-color rivalry burst (Cyan + Purple) for match confirmations or hero interaction.
 */
export function burstRivalryConfetti(originX = 0.5, originY = 0.6) {
  if (typeof window === 'undefined') return;

  confetti({
    particleCount: 60,
    spread: 70,
    origin: { x: originX, y: originY },
    colors: ['#3ec9e6', '#22d3ee', '#a78bfa', '#c084fc', '#ffffff'],
    zIndex: 9999,
    disableForReducedMotion: false,
  });
}
