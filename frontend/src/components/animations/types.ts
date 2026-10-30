import type { ReactNode } from "react";
import type { createTimeline } from "animejs";

export interface Anchor { x: number; y: number; width: number; radiusY: number }
export interface SceneProps {
  clip: string; anchor: Anchor; openingRadiusY: number; color: string; resultColor: string;
  receiver?: string; implement?: string; source?: string;
  result?: string; resultImage: ReactNode; resultProgress: number;
}
export interface ActionAnimation {
  caption: string;
  anchor: Anchor;
  container: RegExp;
  implement?: RegExp;
  motion(timeline: ReturnType<typeof createTimeline>): void;
  Scene(props: SceneProps): ReactNode;
}

export const BOWL: Anchor = { x: 180, y: 193, width: 182, radiusY: 22 };
export const CUP: Anchor = { x: 205, y: 166, width: 96, radiusY: 8 };
export const PAN: Anchor = { x: 180, y: 180, width: 170, radiusY: 17 };
