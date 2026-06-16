#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const VERSION = "0.2.0";
const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (process.argv.includes("-v") || process.argv.includes("--version")) {
  console.log(VERSION);
  process.exit(0);
}

const targetArg = args[0] ?? "my-building";
const dir = path.resolve(process.cwd(), targetArg);
const name = path.basename(dir).replace(/[^a-z0-9-]/gi, "-").toLowerCase();

if (existsSync(dir)) {
  const stat = statSync(dir);
  if (!stat.isDirectory()) {
    console.error(`Target path "${targetArg}" exists and is not a directory.`);
    process.exit(1);
  }
  if (readdirSync(dir).length > 0) {
    console.error(`Target directory "${targetArg}" exists and is not empty.`);
    process.exit(1);
  }
}

// Pin to the published library line.
const RA = "^0.1.0";

const files = {
  "package.json": JSON.stringify(
    {
      name,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        "@react-arch/react": RA,
        "@react-arch/studio": RA,
        react: "^18.3.1",
        "react-dom": "^18.3.1",
      },
      devDependencies: {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        "@vitejs/plugin-react": "^4.3.4",
        typescript: "^5.7.2",
        vite: "^6.0.0",
      },
    },
    null,
    2,
  ),

  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ["src", "vite.config.ts"],
    },
    null,
    2,
  ),

  ".gitignore": "node_modules/\ndist/\n.DS_Store\n",

  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name} — React Arch</title>
    <style>html,body,#root{height:100%;margin:0}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,

  "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
`,

  "src/main.tsx": `import { createRoot } from "react-dom/client";
import { Studio } from "@react-arch/studio";
import "@react-arch/studio/style.css";
import { House } from "./House.js";

// The full React Arch Studio — the same visualizer you get from \`pnpm dev\`
// in the React Arch repo. Edit House.tsx and it updates live (Vite HMR).
createRoot(document.getElementById("root")!).render(
  <div style={{ position: "fixed", inset: 0 }}>
    <Studio component={House} />
  </div>,
);
`,

  "src/House.tsx": `import { Building, Door, Floor, Room, Window, Fixture } from "@react-arch/react";

export function House() {
  return (
    <Building name="My House" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="living" name="Living Room" x={0} y={0} width={5} depth={4}>
          <Door wall="south" offset={1} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.2} height={1.4} />
          <Fixture type="sofa" x={2.5} y={3} />
        </Room>

        <Room id="kitchen" name="Kitchen" x={5} y={0} width={4} depth={4}>
          <Window wall="north" offset={2} width={1.6} />
          <Door wall="west" offset={2} width={0.9} />
        </Room>
      </Floor>
    </Building>
  );
}
`,

  "README.md": `# ${name}

A [React Arch](https://github.com/react-arch/react-arch) project — declarative
building design with React.

\`\`\`bash
npm install
npm run dev      # opens the full React Arch Studio for this project
\`\`\`

Edit \`src/House.tsx\` (or add floors/rooms) and the Studio's 2D / 3D / JSON views
update live. This is the same Studio used in the React Arch repo — the
\`<Studio>\` component from \`@react-arch/studio\`.
`,
};

mkdirSync(dir, { recursive: true });
for (const [rel, content] of Object.entries(files)) {
  const full = path.join(dir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

const rel = path.relative(process.cwd(), dir) || ".";
console.log(`
Created a React Arch project in ${rel}

Next steps:
  cd ${rel}
  npm install
  npm run dev

Then edit src/House.tsx and watch the 2D / 3D preview update live.
`);
