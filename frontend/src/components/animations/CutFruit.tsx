import { tint } from "../../lib/tint";

// A recognisable fruit lying on the board, centred on (x, y), when no ingredient art exists.
export default function CutFruit({ strawberry, color, x, y }: { strawberry: boolean; color: string; x: number; y: number }) {
  if (strawberry) return <>
    <path d={`M${x + 27} ${y - 19}C${x + 8} ${y - 27} ${x - 20} ${y - 19} ${x - 33} ${y + 1}C${x - 19} ${y + 20} ${x + 8} ${y + 25} ${x + 27} ${y + 18}C${x + 35} ${y + 9} ${x + 35} ${y - 11} ${x + 27} ${y - 19}Z`}
      fill="#d3333b" stroke="#00000035" strokeWidth="1.5" />
    {[[-18, -2], [-8, -11], [-6, 6], [4, -2], [6, 14], [14, -12], [16, 4], [-16, 10], [-2, -18], [20, 13]].map(([dx, dy]) =>
      <ellipse key={`${dx}${dy}`} cx={x + dx} cy={y + dy} rx="1.3" ry="2" fill="#f4d46a" transform={`rotate(-30 ${x + dx} ${y + dy})`} />)}
    <path d={`M${x - 16} ${y - 12}Q${x - 2} ${y - 20} ${x + 12} ${y - 18}`} fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
    <path d={`M${x + 31} ${y - 15}L${x + 15} ${y - 12}L${x + 27} ${y - 5}L${x + 12} ${y + 1}L${x + 27} ${y + 6}L${x + 16} ${y + 15}L${x + 32} ${y + 12}Z`}
      fill="#5d9a3a" stroke="#3f6f26" strokeWidth="1" strokeLinejoin="round" />
    <path d={`M${x + 31} ${y - 1}H${x + 40}`} stroke="#4f7d32" strokeWidth="3" strokeLinecap="round" />
  </>;
  return <>
    <path d={`M${x - 34} ${y + 1}C${x - 30} ${y - 25} ${x + 30} ${y - 25} ${x + 34} ${y + 1}C${x + 30} ${y + 25} ${x - 30} ${y + 25} ${x - 34} ${y + 1}Z`}
      fill={color} stroke="#00000035" strokeWidth="1.5" />
    {[[-20, -6], [-10, 8], [0, -12], [8, 6], [18, -4], [-4, 16], [22, 10], [-22, 10]].map(([dx, dy]) =>
      <circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r="0.9" fill="#00000030" />)}
    <ellipse cx={x - 10} cy={y - 11} rx="11" ry="5" fill="#ffffff" opacity="0.32" transform={`rotate(-12 ${x - 10} ${y - 11})`} />
    <ellipse cx={x + 35} cy={y + 1} rx="2.5" ry="3" fill={tint(color, -0.2)} />
  </>;
}
