import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
const root = import.meta.dirname;
const proxy = {
  "/api": "http://127.0.0.1:8080",
  "/media": "http://127.0.0.1:8080",
  "/images": "http://127.0.0.1:8080",
};
export default defineConfig({
  plugins: [
    react({ babel: { plugins: [["babel-plugin-react-compiler"]] } }),
    {
      name: "publish-optimized-assets",
      apply: "build",
      async closeBundle() {
        const destination = path.join(root, "dist");
        await mkdir(destination, { recursive: true });
        for (const name of [
          "recipes.json",
          "asset-manifest.json",
          "favicon.svg",
        ])
          await cp(
            path.join(root, "public", name),
            path.join(destination, name),
            { recursive: true },
          );
        const recipes = JSON.parse(await readFile(path.join(root, "public/recipes.json"), "utf8")) as { id: string }[];
        const manifest = JSON.parse(await readFile(path.join(root, "public/asset-manifest.json"), "utf8")) as Record<string, string>;
        await mkdir(path.join(destination, "thumbnails"), { recursive: true });
        await mkdir(path.join(destination, "assets"), { recursive: true });
        for (const file of [...recipes.map((r) => `/thumbnails/${r.id}.webp`), ...Object.values(manifest)])
          await cp(path.join(root, "public", file), path.join(destination, file));
      },
    },
  ],
  // Original PNGs remain available from the backend; ship only optimized display assets.
  build: { copyPublicDir: false },
  server: { host: "127.0.0.1", proxy, headers: { "X-Frame-Options": "DENY", "Content-Security-Policy": "frame-ancestors 'none'" } },
  preview: { host: "127.0.0.1", proxy, headers: { "X-Frame-Options": "DENY", "Content-Security-Policy": "frame-ancestors 'none'" } },
});
