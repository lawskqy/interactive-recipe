import type { ReactNode } from "react";
import ActionVessel from "../ActionVessel";
import type { SceneProps } from "./types";

export function CupBack({ clip, receiver, anchor, resultProgress, liquid, children }: SceneProps & {
  liquid?: string; children?: ReactNode;
}) {
  return <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
    <ActionVessel src={receiver} anchor={anchor} fallback={<>
      <path d="M253 180Q288 174 278 209Q275 224 249 222" fill="none" stroke="#b9aa8e" strokeWidth="6" />
      <path d="M157 166H253L242 244Q205 256 168 244Z" fill="#eee4ce" fillOpacity="0.12" stroke="#b9aa8e" strokeWidth="2" />
      {liquid && <g clipPath={`url(#${clip})`}>
        <g className="cup-liquid">
          <path d="M152 185Q205 170 259 185V258H152Z" fill={liquid} />
          <ellipse cx="205" cy="185" rx="49" ry="10" fill="#fff7e2" opacity="0.3" />
          {children}
        </g>
      </g>}
      <path d="M174 180L181 237" fill="none" stroke="#fff9eb" strokeWidth="4" opacity="0.55" />
      <ellipse cx="205" cy="166" rx="48" ry="8" fill="none" stroke="#b9aa8e" strokeWidth="2" />
    </>} />
  </g>;
}

export function CupFront({ clip, receiver, anchor, resultProgress, result, liquid }: SceneProps & { liquid?: string }) {
  return <g className="vessel-front" clipPath={`url(#${clip}-front)`}>
    <g style={{ opacity: 1 - resultProgress }}>
      <ActionVessel src={receiver} anchor={anchor} fallback={<>
        {liquid && <g clipPath={`url(#${clip})`}>
          <path className="cup-liquid" d="M152 192Q205 204 259 192V258H152Z" fill={liquid} opacity="0.7" />
        </g>}
        <path d="M157 166H253L242 244Q205 256 168 244Z" fill="#eee4ce" fillOpacity="0.1" stroke="#b9aa8e" strokeWidth="2" />
        <path d="M174 180L181 237" fill="none" stroke="#fff9eb" strokeWidth="4" opacity="0.55" />
      </>} />
    </g>
    {result && <use href={`#${clip}-result`} />}
  </g>;
}
