export function TeaBag({ className, leaves }: { className: string; leaves: string }) {
  return <g className={className}>
    <path d="M212 176Q224 140 262 128" fill="none" stroke="#d8ccb4" strokeWidth="1.5" />
    <rect x="252" y="118" width="22" height="16" rx="2" fill="#c98f5a" stroke="#9f6c40" strokeWidth="1.5" />
    <path d="M198 178H226L224 214Q212 220 200 214Z" fill="#efe3c8" stroke="#cbbb9c" strokeWidth="1.5" />
    <path d="M202 196Q212 190 222 196V210Q212 214 202 210Z" fill={leaves} opacity="0.8" />
  </g>;
}
