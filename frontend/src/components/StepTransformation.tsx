import type { StepAsset } from "../lib/recipe";

const progress = (elapsed: number, start: number, duration: number) =>
  Math.max(0, Math.min(1, (elapsed - start) / duration));

// Every moving element uses the same clock so pause and replay stay in sync.
export default function StepTransformation({
  assets,
  elapsed,
}: {
  assets: StepAsset[];
  elapsed: number;
}) {
  const items = assets.length ? assets : [{ name: "This step" }];
  const burst = progress(elapsed, 2700, 1500);
  const spread = 1 - (1 - burst) ** 3;
  return (
    <svg className="step-transformation" viewBox="0 0 360 320" aria-hidden="true">
      <circle
        cx="180" cy="150" r={12 + spread * 105}
        fill="none" stroke="var(--brass)" strokeWidth={2 * (1 - burst)}
        opacity={elapsed >= 2700 ? (1 - burst) * 0.6 : 0}
      />
      {items.map((item, index) => {
        const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2;
        const t = progress(elapsed, 650 + (index / items.length) * 350, 1900);
        const gather = t * t * (3 - 2 * t);
        const x = 180 + Math.cos(angle) * 119 * (1 - gather);
        const y = 150 + Math.sin(angle) * 102 * (1 - gather);
        return (
          <g key={item.name + index}
            transform={`translate(${x} ${y}) scale(${1 - gather * 0.65})`}
            opacity={1 - progress(elapsed, 2450, 450)}>
            {!item.src && <circle r="31" fill="var(--paper)" fillOpacity="0.85" />}
            {item.src ? (
              <image href={item.src} x="-29" y="-29" width="58" height="58" />
            ) : (
              <text textAnchor="middle" y="8" fontSize="27" fill="var(--brass)">✧</text>
            )}
            <text textAnchor="middle" y="43" fontSize="10" fill="var(--muted)"
              opacity={1 - gather}>
              {item.name.length > 23 ? `${item.name.slice(0, 21)}…` : item.name}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 30 }, (_, index) => {
        const angle = index * 2.39996;
        const distance = spread * (48 + (index % 5) * 20);
        return (
          <circle key={index}
            cx={180 + Math.cos(angle) * distance}
            cy={150 + Math.sin(angle) * distance + burst * burst * 18}
            r={(2 + index % 4) * (1 - burst * 0.6)}
            fill={index % 3 ? "var(--brass)" : "var(--sage)"}
            opacity={elapsed >= 2700 ? (1 - burst) * 0.85 : 0}
          />
        );
      })}
    </svg>
  );
}
