import confetti from 'canvas-confetti';

/**
 * Triggers a triumphant multi-stage golden confetti celebration for championships and awards.
 */
export function burstTrophyConfetti(originX = 0.5, originY = 0.5) {
  if (typeof window === 'undefined') return;

  const defaults = {
    zIndex: 99999,
    disableForReducedMotion: false,
  };

  // Stage 1: Immediate central golden geyser
  confetti({
    ...defaults,
    particleCount: 80,
    spread: 45,
    startVelocity: 60,
    origin: { x: originX, y: originY },
    colors: ['#ffd700', '#fbbf24', '#f59e0b', '#ffffff'],
    shapes: ['star', 'circle'],
    scalar: 1.1,
  });

  // Stage 2: Dual stadium cross-fire cannons from left and right flanks (200ms delay)
  setTimeout(() => {
    // Left cannon
    confetti({
      ...defaults,
      particleCount: 65,
      angle: 60,
      spread: 55,
      startVelocity: 55,
      origin: { x: 0.1, y: 0.7 },
      colors: ['#fbbf24', '#d97706', '#fef3c7', '#ffffff'],
    });

    // Right cannon
    confetti({
      ...defaults,
      particleCount: 65,
      angle: 120,
      spread: 55,
      startVelocity: 55,
      origin: { x: 0.9, y: 0.7 },
      colors: ['#ffd700', '#f59e0b', '#fef08a', '#ffffff'],
    });
  }, 200);

  // Stage 3: Slow-drifting golden glitter shower from overhead (450ms delay)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 90,
      spread: 140,
      startVelocity: 30,
      origin: { x: 0.5, y: 0.2 },
      decay: 0.94,
      gravity: 0.7,
      scalar: 1.2,
      shapes: ['star'],
      colors: ['#ffd700', '#fbbf24', '#ffffff', '#eab308'],
    });
  }, 450);
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
