import { useCutoutLayout } from "../../lib/cutout-layout";

// A knife lying along the x axis, centred on the origin, tip to the left and edge down.
export default function CutKnife({ src }: { src?: string }) {
  const layout = useCutoutLayout(src);
  if (!src || !layout) return <>
    <path d="M2 -12H-40Q-58 -10 -66 6Q-56 10 -44 10H2Z" fill="#dcdcd6" stroke="#9e9a93" strokeWidth="1.5" />
    <path d="M-44 7H0" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
    <rect x="2" y="-13" width="6" height="24" rx="1.5" fill="#8f8b84" />
    <rect x="8" y="-9" width="56" height="17" rx="6" fill="#4a3a2e" />
    {[22, 38, 52].map(x => <circle key={x} cx={x} cy="-0.5" r="1.8" fill="#d8c9a8" />)}
  </>;
  const width = layout.right - layout.left, height = layout.bottom - layout.top;
  const art = (x: number, y: number, w: number, h: number) =>
    <svg x={x} y={y} width={w} height={h} viewBox={`${layout.left} ${layout.top} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet" overflow="visible">
      <image data-cutout="true" href={src} x="0" y="0" width={layout.width} height={layout.height} />
    </svg>;
  // Lying art keeps its taller blade end on the left; standing art turns its blade end to the left.
  if (width >= height) return <g transform={layout.heavyEnd === "right" ? "scale(-1 1)" : undefined}>{art(-65, -20, 130, 40)}</g>;
  return <g transform={`rotate(${layout.handleDown ? -90 : 90})`}>{art(-20, -65, 40, 130)}</g>;
}
