import type { SceneGeometry } from "./types";

// Place stacked pieces ([offset, row, tilt]) on the vessel floor, squeezing each
// row toward the axis so every piece of the given radius stays inside the walls.
export function stackOnFloor(scene: SceneGeometry, items: number[][], bottom: number, rise: number, radius: number) {
  return items.map(([offset, row, angle]) => {
    const y = bottom - row * rise;
    const spread = row ? 1 : 0.85;
    const widest = Math.max(...items.filter(item => item[1] === row).map(item => Math.abs(item[0] * spread)));
    const inside = scene.insideAt?.(y);
    const room = inside === undefined ? widest : Math.max(0, inside - radius);
    return [scene.anchor.x + offset * spread * (widest > room ? room / widest : 1), y, angle];
  });
}

// How far a tool can swing sideways at depth y and still stay inside the vessel.
export function swingRoom(scene: SceneGeometry, y: number, swing: number, halfWidth: number) {
  const inside = scene.insideAt?.(y);
  return inside === undefined ? swing : Math.max(0, Math.min(swing, inside - halfWidth));
}

// Where a tool lowered into the measured vessel ends: partway down, never through its floor.
// travel is how far the motion itself pushes the tool below this resting point.
export function toolTip({ anchor, openingRadiusY, floor }: SceneGeometry, fallbackFloor: number, depth: number, clearance: number,
  travel = 0) {
  const bottom = floor ?? fallbackFloor;
  const shallowest = anchor.y + openingRadiusY + 6;
  return Math.min(bottom - 4 - travel, Math.max(shallowest, Math.min(bottom - clearance, anchor.y + (bottom - anchor.y) * depth)));
}

export const spoonTip = (scene: SceneGeometry, travel = 0) => toolTip(scene, 236, 0.75, 10, travel);
