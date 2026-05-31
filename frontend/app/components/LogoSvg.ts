export function renderLogoSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="12 12 76 76" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Premium linear gradient for main branding elements -->
    <linearGradient id="logo-grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>

    <!-- High-tech glow effect -->
    <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- 1. Outer Target Viewfinder Brackets -->
  <g stroke="#06b6d4" stroke-width="1.8" stroke-linecap="round" opacity="0.9">
    <path d="M 23,15 L 15,15 L 15,23" />
    <path d="M 77,15 L 85,15 L 85,23" />
    <path d="M 15,77 L 15,85 L 23,85" />
    <path d="M 85,77 L 85,85 L 77,85" />
  </g>

  <!-- 2. Symmetrical Front-Facing Face Mesh (Clean, pure vector biometric grid) -->
  <g>
    <!-- Facial outline & connection lines -->
    <path d="
      M 50,18 L 64,22 L 75,34 L 77,48 L 76,64 L 66,78 L 50,84 L 34,78 L 24,64 L 23,48 L 25,34 L 36,22 L 50,18 Z
      M 50,18 L 50,30 L 50,42 L 50,48 L 50,62 L 50,72 L 50,76 L 50,80 L 50,84
      M 50,18 L 36,22 M 50,18 L 64,22
      M 50,30 L 36,22 M 50,30 L 64,22
      M 50,30 L 25,34 M 50,30 L 75,34
      M 25,34 L 36,22 M 75,34 L 64,22
      M 25,34 L 23,48 M 75,34 L 77,48
      M 23,48 L 24,64 M 77,48 L 76,64
      M 24,64 L 34,78 M 76,64 L 66,78
      M 34,78 L 50,84 M 66,78 L 50,84
      M 24,64 L 42,64 M 76,64 L 58,64
      M 50,62 L 42,64 M 50,62 L 58,64
      M 42,64 L 38,73 M 58,64 L 62,73
      M 34,78 L 38,73 M 66,78 L 62,73
      M 50,72 L 38,73 M 50,72 L 62,73
      M 50,76 L 38,73 M 50,76 L 62,73
      M 50,76 L 50,80
      M 50,80 L 34,78 M 50,80 L 66,78
      M 50,42 L 38,42 M 50,42 L 62,42
      M 38,42 L 34,48 L 50,48 M 62,42 L 66,48 L 50,48
      M 38,42 L 25,34 M 62,42 L 75,34
      M 34,48 L 23,48 M 66,48 L 77,48
      M 34,48 L 42,64 M 66,48 L 58,64
    " stroke="url(#logo-grad)" stroke-width="1.1" stroke-opacity="0.8" fill="none" />

    <!-- Symmetrical Face Grid Nodes (Intersections) -->
    <g fill="#06b6d4" opacity="0.95" filter="url(#glow-effect)">
      <circle cx="50" cy="18" r="1.0" />
      <circle cx="36" cy="22" r="1.0" />
      <circle cx="64" cy="22" r="1.0" />
      <circle cx="25" cy="34" r="1.0" />
      <circle cx="75" cy="34" r="1.0" />
      <circle cx="23" cy="48" r="1.0" />
      <circle cx="77" cy="48" r="1.0" />
      <circle cx="24" cy="64" r="1.0" />
      <circle cx="76" cy="64" r="1.0" />
      <circle cx="34" cy="78" r="1.0" />
      <circle cx="66" cy="78" r="1.0" />
      <circle cx="50" cy="84" r="1.0" />
      <circle cx="42" cy="64" r="1.0" />
      <circle cx="58" cy="64" r="1.0" />
      <circle cx="38" cy="73" r="1.0" />
      <circle cx="62" cy="73" r="1.0" />
      <circle cx="50" cy="76" r="1.0" />
      <circle cx="50" cy="80" r="1.0" />
      
      <!-- Central face nodes (revealed) -->
      <circle cx="50" cy="30" r="1.0" />
      <circle cx="50" cy="42" r="1.0" />
      <circle cx="38" cy="42" r="1.0" />
      <circle cx="62" cy="42" r="1.0" />
      <circle cx="34" cy="48" r="1.0" />
      <circle cx="66" cy="48" r="1.0" />
      <circle cx="50" cy="48" r="1.0" />
      <circle cx="50" cy="62" r="1.0" />
      <circle cx="50" cy="72" r="1.0" />
    </g>
  </g>
</svg>`;
}
