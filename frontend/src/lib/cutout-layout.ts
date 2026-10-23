import { useEffect, useState } from "react";

export interface CutoutLayout {
  width: number; height: number;
  left: number; top: number; right: number; bottom: number;
  handleDown: boolean;
  opening: { x: number; y: number; width: number; radiusY: number };
}

const layouts = new Map<string, Promise<CutoutLayout | null>>();

function measure(src: string): Promise<CutoutLayout | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onerror = () => resolve(null);
    image.onload = () => {
      try {
        const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
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
        // On front/three-quarter vessel drawings the widest upper contour is
        // the rim. The empty vessel and its result share this same anchor.
        let rim = top;
        for (let y = top; y <= top + Math.floor((bottom - top) * 0.4); y++) {
          if (rows[y].right - rows[y].left > rows[rim].right - rows[rim].left) rim = y;
        }
        const rimWidth = Math.max(1, rows[rim].right - rows[rim].left + 1);
        const radiusY = Math.max(rimWidth * 0.055, Math.min(rimWidth * 0.16, rim - top));
        resolve({ width: image.naturalWidth, height: image.naturalHeight,
          left: left / scale, top: top / scale, right: (right + 1) / scale, bottom: (bottom + 1) / scale,
          handleDown: widest(top) > widest(bottom - third + 1) * 1.3,
          opening: { x: (rows[rim].left + rows[rim].right + 1) / (2 * scale), y: rim / scale,
            width: rimWidth / scale, radiusY: radiusY / scale } });
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
