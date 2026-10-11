'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname changes, complete progress
  useEffect(() => {
    setProgress(100);
    const timeout = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 350);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Intercept click on internal links
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.hasAttribute('download') &&
        anchor.target !== '_blank'
      ) {
        const url = new URL(anchor.href);
        if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
          setLoading(true);
          setProgress(25);
          setTimeout(() => setProgress(65), 100);
          setTimeout(() => setProgress(85), 250);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(90deg, var(--p-a) 0%, var(--p-b) 100%)',
        boxShadow: '0 0 12px rgba(62, 201, 230, 0.7), 0 0 6px rgba(167, 139, 250, 0.7)',
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  );
}
