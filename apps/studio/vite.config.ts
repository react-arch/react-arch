import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-oxc";
import { fileURLToPath, URL } from "node:url";

const rel = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Resolve workspace packages to their TS source so the Studio transpiles them
// directly (full HMR across the repo, no per-package build step).
const alias = {
  "@react-arch/shared": rel("../../packages/shared/src/index.ts"),
  "@react-arch/geometry": rel("../../packages/geometry/src/index.ts"),
  "@react-arch/core": rel("../../packages/core/src/index.ts"),
  "@react-arch/react": rel("../../packages/react/src/index.ts"),
  "@react-arch/renderer-2d": rel("../../packages/renderer-2d/src/index.ts"),
  "@react-arch/renderer-3d": rel("../../packages/renderer-3d/src/index.ts"),
  "@react-arch/exporters": rel("../../packages/exporters/src/index.ts"),
  "@react-arch/validation": rel("../../packages/validation/src/index.ts"),
  "@react-arch/importers": rel("../../packages/importers/src/index.ts"),
  "@react-arch/examples": rel("../../examples/buildings/src/index.ts"),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  server: { port: 5173 },
  optimizeDeps: {
    // react-reconciler/scheduler are nested deps of @react-arch/react and are
    // discovered automatically when Vite crawls the aliased source.
    include: ["react", "react-dom", "three"],
  },
});
