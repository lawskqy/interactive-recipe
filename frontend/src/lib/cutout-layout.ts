import { useEffect, useState } from "react";

export interface CutoutLayout {
  width: number; height: number;
  left: number; top: number; right: number; bottom: number;
  handleDown: boolean;
  // Side a jug or mug's handle sticks out of, and the top corner of each side to pour from.
  handleSide?: "left" | "right";
  lips: { left: { x: number; y: number }; right: { x: number; y: number } };
  // The taller end of a lying-down object, e.g. a knife's blade.
  heavyEnd: "left" | "right";
  opening: { x: number; y: number; width: number; radiusY: number };
  // A lid, cap or neck stands above the rim, e.g. a closed shaker.
  lid: boolean;
  body: { x: number; y: number; width: number; top: number };
  // Visible width of each measured row, in image pixels; row = image y × rowScale.
  widths: number[]; rowScale: number;
  // Distance from the axis to the nearer outer edge of each row, in image pixels.
  halves: number[];
}

export function widthAt(layout: CutoutLayout, y: number) {
  return layout.widths[Math.floor(y * layout.rowScale)] ?? 0;
}

export function halfWidthAt(layout: CutoutLayout, y: number) {
  return layout.halves[Math.floor(y * layout.rowScale)] ?? 0;
}

const layouts = new Map<string, Promise<CutoutLayout | null>>();

function measure(src: string): Promise<CutoutLayout | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onerror = () => resolve(null);
    image.onload = () => {
      try {
        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) { resolve(null); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
        const rows = Array.from({ length: canvas.height }, () => ({ left: canvas.width, right: -1 }));
        const columns = Array.from({ length: canvas.width }, () => ({ top: canvas.height, bottom: -1 }));
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] < 64) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
          rows[y].left = Math.min(rows[y].left, x);
          rows[y].right = Math.max(rows[y].right, x);
          columns[x].top = Math.min(columns[x].top, y);
          columns[x].bottom = Math.max(columns[x].bottom, y);
        }
        if (right < left) { resolve(null); return; }
        const tallest = (from: number, to: number) => Math.max(...columns.slice(from, to).map(column => column.bottom - column.top));
        const columnThird = Math.max(1, Math.floor((right - left + 1) / 3));
        const third = Math.max(1, Math.floor((bottom - top + 1) / 3));
        const widest = (start: number) => Math.max(...rows.slice(start, start + third).map(row => row.right - row.left));
        // The base has no handle or spout, so it gives the vessel's axis; widths
        // are measured symmetrically about it so a handle never widens or
        // shifts the opening.
        const base = rows.slice(Math.round(bottom - (bottom - top) * 0.08), bottom + 1).filter(row => row.right >= row.left);
        const axis = base.reduce((sum, row) => sum + (row.left + row.right + 1) / 2, 0) / base.length;
        const half = (y: number) => rows[y].right < rows[y].left ? 0 : Math.max(0, Math.min(axis - rows[y].left, rows[y].right + 1 - axis));
        // On front/three-quarter vessel drawings the widest upper contour is
        // the rim. The empty vessel and its result share this same anchor.
        let rim = top;
        for (let y = top; y <= top + Math.floor((bottom - top) * 0.4); y++) if (half(y) > half(rim)) rim = y;
        const rimWidth = Math.max(1, 2 * half(rim));
        const radiusY = Math.max(rimWidth * 0.055, Math.min(rimWidth * 0.16, rim - top));
        const above = rows.slice(top, rim).filter(row => row.right >= row.left);
        const lid = rim - top > (bottom - top) * 0.2 &&
          above.reduce((sum, row) => sum + row.right - row.left + 1, 0) / above.length < rimWidth * 0.7;
        // The body band skips what changes between an empty vessel and its
        // result: foam, ice or garnish above the rim and a shadow at the base.
        const bandTop = Math.round(top + (bottom - top) * 0.45), bandBottom = top + Math.round((bottom - top) * 0.85);
        const span = (y: number) => rows[y].right - rows[y].left;
        let peak = bandTop;
        for (let y = bandTop; y <= bandBottom; y++) if (span(y) > span(peak)) peak = y;
        // Straight walls give a plateau of equal widths; its middle is stable across resolutions.
        let first = peak, last = peak;
        while (first > bandTop && span(first - 1) >= span(peak) - 1) first--;
        while (last < bandBottom && span(last + 1) >= span(peak) - 1) last++;
        const body = Math.round((first + last) / 2);
        // A handle is a loop: scanning out from the axis meets the body, a hole, then the handle again.
        const opaque = (x: number, y: number) => data[(y * canvas.width + x) * 4 + 3] >= 64;
        const looped = (y: number, step: number) => {
          let phase = 0;
          for (let x = Math.round(axis); x >= 0 && x < canvas.width; x += step) {
            const solid = opaque(x, y);
            if (phase === 0 && solid) phase = 1;
            else if (phase === 1 && !solid) phase = 2;
            else if (phase === 2 && solid) return true;
          }
          return false;
        };
        const height = bottom - top + 1;
        let leftLoops = 0, rightLoops = 0, leftReach = 0, rightReach = 0;
        for (let y = top + Math.round(height * 0.15); y <= bottom - Math.round(height * 0.1); y++) {
          if (rows[y].right < rows[y].left) continue;
          if (looped(y, -1)) leftLoops++;
          if (looped(y, 1)) rightLoops++;
          if (y >= top + height * 0.25 && y <= top + height * 0.85) {
            leftReach = Math.max(leftReach, axis - rows[y].left);
            rightReach = Math.max(rightReach, rows[y].right + 1 - axis);
          }
        }
        const minimum = Math.max(3, height * 0.04);
        const handleSide = rightLoops >= minimum && rightLoops > leftLoops * 1.5 ? "right"
          : leftLoops >= minimum && leftLoops > rightLoops * 1.5 ? "left"
          : rightReach > leftReach * 1.08 ? "right" : leftReach > rightReach * 1.08 ? "left" : undefined;
        // The pouring lip reaches furthest up and outwards together, so a
        // spout wins over a rounder, wider belly lower down.
        const lip = (side: "left" | "right") => {
          const reach = (y: number) => (side === "right" ? rows[y].right - axis : axis - rows[y].left) - (y - top);
          let best = top;
          for (let y = top; y <= top + Math.floor(height * 0.5); y++) {
            if (rows[y].right < rows[y].left) continue;
            if (rows[best].right < rows[best].left || reach(y) > reach(best)) best = y;
          }
          return { x: (side === "right" ? rows[best].right + 1 : rows[best].left) / scale, y: best / scale };
        };
        resolve({ width: image.naturalWidth, height: image.naturalHeight,
          left: left / scale, top: top / scale, right: (right + 1) / scale, bottom: (bottom + 1) / scale,
          handleDown: widest(top) > widest(bottom - third + 1) * 1.3,
          handleSide, lips: { left: lip("left"), right: lip("right") },
          heavyEnd: tallest(right - columnThird + 1, right + 1) > tallest(left, left + columnThird) ? "right" : "left",
          opening: { x: axis / scale, y: rim / scale, width: rimWidth / scale, radiusY: radiusY / scale }, lid,
          halves: rows.map((_, y) => half(y) / scale),
          body: { x: (rows[body].left + rows[body].right + 1) / (2 * scale), y: body / scale,
            width: Math.max(1, rows[body].right - rows[body].left + 1) / scale, top: bandTop / scale },
          widths: rows.map(row => Math.max(0, row.right - row.left + 1) / scale), rowScale: scale });
      } catch { resolve(null); }
    };
    image.src = src;
  });
}

export function useCutoutLayout(src?: string) {
  const [state, setState] = useState<{ src: string; layout: CutoutLayout | null } | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    if (!layouts.has(src)) {
      if (layouts.size >= 150) layouts.delete(layouts.keys().next().value!);
      layouts.set(src, measure(src));
    }
    void layouts.get(src)!.then(layout => { if (!cancelled) setState({ src, layout }); });
    return () => { cancelled = true; };
  }, [src]);
  return state && state.src === src ? state.layout : undefined;
}
