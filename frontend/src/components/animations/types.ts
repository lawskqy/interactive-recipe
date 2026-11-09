import type { ReactNode } from "react";
import type { createTimeline } from "animejs";

export interface Anchor { x: number; y: number; width: number; radiusY: number }
export interface SceneProps {
  clip: string; anchor: Anchor; openingRadiusY: number; floor?: number; color: string; resultColor: string;
  receiver?: string; implement?: string; source?: string; piece?: string;
  // The step text the action was read from.
  subject: string;
  result?: string; resultImage: ReactNode; resultProgress: number;
  // Inside half-width of the measured vessel at a scene height, about anchor.x.
  insideAt?: (y: number) => number;
}
export type SceneGeometry = Pick<SceneProps, "anchor" | "openingRadiusY" | "floor" | "insideAt">;
export interface ActionAnimation {
  caption: string;
  anchor: Anchor;
  container: RegExp;
  // Work surfaces the action draws itself; they are never used as its vessel.
  surface?: RegExp;
  implement?: RegExp;
  motion(timeline: ReturnType<typeof createTimeline>, geometry: SceneGeometry): void;
  Scene(props: SceneProps): ReactNode;
}

export const BOWL: Anchor = { x: 180, y: 193, width: 182, radiusY: 22 };
export const CUP: Anchor = { x: 205, y: 166, width: 96, radiusY: 8 };
// A pitcher tilts about its lip, so a poured stream always leaves from here.
export const POUR_LIP = { x: 172, y: 76 };
export const PAN: Anchor = { x: 180, y: 180, width: 170, radiusY: 17 };
