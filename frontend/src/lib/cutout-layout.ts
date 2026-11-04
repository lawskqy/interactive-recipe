import { useEffect, useState } from "react";

export interface CutoutLayout {
  width: number; height: number;
  left: number; top: number; right: number; bottom: number;
  handleDown: boolean;
  opening: { x: number; y: number; width: number; radiusY: number };
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
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] < 64) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
          rows[y].left = Math.min(rows[y].left, x);
          rows[y].right = Math.max(rows[y].right, x);
        }
        if (right < left) { resolve(null); return; }
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
        resolve({ width: image.naturalWidth, height: image.naturalHeight,
          left: left / scale, top: top / scale, right: (right + 1) / scale, bottom: (bottom + 1) / scale,
          handleDown: widest(top) > widest(bottom - third + 1) * 1.3,
          opening: { x: axis / scale, y: rim / scale, width: rimWidth / scale, radiusY: radiusY / scale },
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
