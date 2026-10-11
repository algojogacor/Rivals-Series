'use client';

import dynamic from 'next/dynamic';

const Trophy3DCanvas = dynamic(() => import('@/components/fx/Trophy3DCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] sm:h-[320px] flex items-center justify-center text-5xl opacity-40 select-none">
      🏆
    </div>
  ),
});

export function TrophyShowcaseClient() {
  return <Trophy3DCanvas />;
}
