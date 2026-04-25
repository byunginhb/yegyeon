interface PointIconProps {
  size?: number
  className?: string
}

export default function PointIcon({ size = 14, className = '' }: PointIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* 외곽 원 — 골드 그라디언트 */}
      <defs>
        <linearGradient id="pg" x1="2" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="pgi" x1="3" y1="3" x2="13" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <circle cx="8" cy="8" r="7.5" fill="url(#pg)" />
      <circle cx="8" cy="8" r="6" fill="url(#pgi)" />
      {/* 안쪽 P 심볼 */}
      <path
        d="M6 4.5h2.8c1.2 0 2 .7 2 1.8s-.8 1.8-2 1.8H7v2.9H6V4.5zm1 .9v1.8h1.7c.7 0 1.1-.3 1.1-.9s-.4-.9-1.1-.9H7z"
        fill="#92400E"
      />
    </svg>
  )
}
