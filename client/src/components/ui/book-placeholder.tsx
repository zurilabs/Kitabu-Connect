interface BookPlaceholderProps {
  title?: string;
  className?: string;
}

export function BookPlaceholder({ title = "Book", className = "" }: BookPlaceholderProps) {
  // Generate a color based on the title to make each placeholder unique
  const getColorFromTitle = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate pleasant, muted colors
    const colors = [
      { primary: '#3b82f6', secondary: '#2563eb', accent: '#1d4ed8' }, // Blue
      { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#6d28d9' }, // Purple
      { primary: '#ec4899', secondary: '#db2777', accent: '#be185d' }, // Pink
      { primary: '#10b981', secondary: '#059669', accent: '#047857' }, // Green
      { primary: '#f59e0b', secondary: '#d97706', accent: '#b45309' }, // Amber
      { primary: '#ef4444', secondary: '#dc2626', accent: '#b91c1c' }, // Red
      { primary: '#06b6d4', secondary: '#0891b2', accent: '#0e7490' }, // Cyan
      { primary: '#6366f1', secondary: '#4f46e5', accent: '#4338ca' }, // Indigo
    ];

    return colors[Math.abs(hash) % colors.length];
  };

  const colors = getColorFromTitle(title);

  // Extract first letter of title for display
  const firstLetter = title.charAt(0).toUpperCase() || 'B';

  return (
    <svg
      viewBox="0 0 200 280"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Book background with gradient */}
      <defs>
        <linearGradient id={`bookGradient-${firstLetter}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: colors.primary, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: colors.secondary, stopOpacity: 1 }} />
        </linearGradient>

        <linearGradient id={`spineGradient-${firstLetter}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: colors.accent, stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: colors.secondary, stopOpacity: 0.9 }} />
        </linearGradient>

        {/* Shadow filter */}
        <filter id={`shadow-${firstLetter}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="2" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Book cover */}
      <rect
        x="15"
        y="10"
        width="170"
        height="260"
        rx="4"
        fill={`url(#bookGradient-${firstLetter})`}
        filter={`url(#shadow-${firstLetter})`}
      />

      {/* Book spine (left edge) */}
      <rect
        x="15"
        y="10"
        width="12"
        height="260"
        rx="4"
        fill={`url(#spineGradient-${firstLetter})`}
      />

      {/* Decorative lines on spine */}
      <line x1="20" y1="30" x2="20" y2="250" stroke="white" strokeWidth="0.5" opacity="0.3"/>
      <line x1="23" y1="30" x2="23" y2="250" stroke="white" strokeWidth="0.5" opacity="0.2"/>

      {/* Inner book detail (pages effect) */}
      <rect
        x="185"
        y="15"
        width="4"
        height="250"
        fill="white"
        opacity="0.9"
      />
      <rect
        x="185"
        y="16"
        width="4"
        height="248"
        fill="#f3f4f6"
        opacity="0.6"
      />

      {/* Decorative frame */}
      <rect
        x="35"
        y="30"
        width="135"
        height="220"
        rx="2"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Book icon in center */}
      <g transform="translate(100, 100)">
        <path
          d="M-20,-15 L-20,15 L-15,18 L15,18 L20,15 L20,-15 L15,-18 L-15,-18 Z"
          fill="white"
          opacity="0.2"
        />
        <path
          d="M-15,-12 L-15,12 M-10,-12 L-10,12 M-5,-12 L-5,12 M0,-12 L0,12 M5,-12 L5,12 M10,-12 L10,12 M15,-12 L15,12"
          stroke="white"
          strokeWidth="0.5"
          opacity="0.15"
        />
      </g>

      {/* Title initial */}
      <text
        x="100"
        y="160"
        fontSize="72"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        opacity="0.9"
      >
        {firstLetter}
      </text>

      {/* Bottom decorative element */}
      <circle cx="100" cy="230" r="3" fill="white" opacity="0.4"/>
      <circle cx="90" cy="230" r="2" fill="white" opacity="0.3"/>
      <circle cx="110" cy="230" r="2" fill="white" opacity="0.3"/>
    </svg>
  );
}
