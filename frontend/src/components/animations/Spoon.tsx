import ActionCutout from "../ActionCutout";

export function StirringSpoon({ src, className }: { src?: string; className: string }) {
  return <g className={className} style={{ transformOrigin: "207px 200px" }}>
    <ActionCutout src={src} x={176} y={48} width={56} height={170} tool fallback={<>
      <path d="M226 52L208 196" stroke="#c5a16a" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="206" cy="204" rx="9" ry="14" transform="rotate(8 206 204)" fill="#d8bd8a" stroke="#b89a70" strokeWidth="2" />
    </>} />
  </g>;
}
