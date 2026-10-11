'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface RollingNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function RollingNumber({
  value,
  duration = 1.2,
  delay = 0,
  className = '',
  prefix = '',
  suffix = '',
}: RollingNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const prevValueRef = useRef<number>(0);
  const valObjRef = useRef<{ val: number }>({ val: 0 });

  useEffect(() => {
    const startVal = prevValueRef.current;
    valObjRef.current.val = startVal;

    const tween = gsap.to(valObjRef.current, {
      val: value,
      duration,
      delay,
      ease: 'power3.out',
      onUpdate: () => {
        setDisplayValue(Math.round(valObjRef.current.val));
      },
      onComplete: () => {
        setDisplayValue(value);
        prevValueRef.current = value;
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, delay]);

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
