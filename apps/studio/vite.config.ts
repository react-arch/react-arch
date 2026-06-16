import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-oxc";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";

const rel = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The `react-arch studio` CLI sets these so the Studio renders the user's
// project. In-repo dev leaves them unset and falls back to the examples.
const userRoot = process.env.RA_ROOT;
const userProject = process.env.RA_PROJECT;

// Resolve workspace packages to their TS source so the Studio transpiles them
// directly (full HMR across the repo, no per-package build step).
const alias = {
  "virtual:react-arch-root": userRoot
    ? path.resolve(userRoot)
    : rel("../../examples/buildings/src/Root.tsx"),
  "@react-arch/shared": rel("../../packages/shared/src/index.ts"),
  "@react-arch/geometry": rel("../../packages/geometry/src/index.ts"),
  "@react-arch/core": rel("../../packages/core/src/index.ts"),
  "@react-arch/react": rel("../../packages/react/src/index.ts"),
  "@react-arch/renderer-2d": rel("../../packages/renderer-2d/src/index.ts"),
  "@react-arch/renderer-3d": rel("../../packages/renderer-3d/src/index.ts"),
  "@react-arch/studio": rel("../../packages/studio/src/index.ts"),
  "@react-arch/exporters": rel("../../packages/exporters/src/index.ts"),
  "@react-arch/validation": rel("../../packages/validation/src/index.ts"),
  "@react-arch/importers": rel("../../packages/importers/src/index.ts"),
  "@react-arch/examples": rel("../../examples/buildings/src/index.ts"),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  server: {
    port: Number(process.env.RA_PORT) || 5173,
    open: process.env.RA_OPEN === "1",
    fs: {
      // Allow serving the Studio repo and, when launched via the CLI, the
      // user's project directory (which lives outside the Studio root).
      allow: [rel("../.."), ...(userProject ? [path.resolve(userProject)] : [])],
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "three"],
  },
});
