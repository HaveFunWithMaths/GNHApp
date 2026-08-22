import React from 'react';

interface FluteIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export const FluteIcon: React.FC<FluteIconProps> = ({
  className = 'w-5 h-5',
  size,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      {/* Main Flute Body (cylindrical bamboo flute angled gracefully) */}
      <line x1="3" y1="21" x2="21" y2="3" strokeWidth="2.5" strokeLinecap="round" />
      {/* Flute Top Banding */}
      <line x1="18.5" y1="2.5" x2="21.5" y2="5.5" strokeWidth="2" />
      <line x1="16.5" y1="4.5" x2="19.5" y2="7.5" strokeWidth="1.5" />
      {/* Finger Tone Holes */}
      <circle cx="15" cy="9" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
      <circle cx="6.5" cy="17.5" r="1" fill="currentColor" />
      {/* Peacock Feather / Silk Tassel on the flute head */}
      <path
        d="M19 4 C21.5 1.5, 23.5 3.5, 22 5.5 C20.5 7, 19 6, 19 4"
        fill="currentColor"
        fillOpacity="0.3"
        strokeWidth="1.2"
      />
      <circle cx="21" cy="4" r="0.75" fill="currentColor" />
      {/* Hanging Tassel thread */}
      <path
        d="M17.5 6 C16.5 8, 17.5 10, 16 11.5"
        strokeWidth="1.2"
        strokeDasharray="1.5 1.5"
      />
      <circle cx="16" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
};
