// RS MONOGRAM VECTOR LOGO
// Extracted with pixel precision from rivals_series_season_1_cover.svg

export function MonogramLogo({ 
  className = "w-8 h-8", 
  fill = "#EEE6DA",
  width,
  height,
}: { 
  className?: string; 
  fill?: string;
  width?: number | string;
  height?: number | string;
}) {
  return (
    <svg 
      viewBox="0 0 100 66" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      width={width}
      height={height}
      style={{ maxWidth: '100%' }}
    >
      {/* Letter R */}
      <path
        d="M6 6 H28 C40 6 48 13 48 24 C48 33 42 39 33 41 L50 60 H34 L19 42 H18 V60 H6 V6 Z M18 16 V32 H27 C34 32 38 29 38 24 C38 19 34 16 27 16 H18 Z"
        fill={fill}
      />
      {/* Letter S */}
      <path
        d="M56 46 C56 55 64 60 76 60 C87 60 96 55 96 46 C96 37 88 34 76 31 C63 28 58 24 58 17 C58 10 65 6 75 6 C85 6 93 11 94 20 H82 C81 16 77 14 74 14 C70 14 67 16 67 19 C67 23 71 25 80 27 C93 30 104 34 104 46 C104 57 93 64 76 64 C59 64 47 56 47 46 H56 Z"
        fill={fill}
      />
    </svg>
  );
}
