#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const VERSION = "0.1.0";
const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (process.argv.includes("-v") || process.argv.includes("--version")) {
  console.log(VERSION);
  process.exit(0);
}

const targetArg = args[0] ?? "my-building";
const dir = path.resolve(process.cwd(), targetArg);
const name = path.basename(dir).replace(/[^a-z0-9-]/gi, "-").toLowerCase();

if (existsSync(dir) && readdirSync(dir).length > 0) {
  console.error(`Target directory "${targetArg}" exists and is not empty.`);
  process.exit(1);
}

const files = {
  "package.json": JSON.stringify(
    {
      name,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        studio: "react-arch studio",
        "studio:open": "react-arch studio --open",
      },
      dependencies: {
        "@react-arch/react": "^0.1.0",
        react: "^18.3.1",
      },
      devDependencies: {
        "react-arch": "^0.1.0",
        "@types/react": "^18.3.12",
        typescript: "^5.7.2",
      },
    },
    null,
    2,
  ),

  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ["src"],
    },
    null,
    2,
  ),

  ".gitignore": "node_modules/\ndist/\n.DS_Store\n",

  "src/Root.tsx": `import { Composition } from "@react-arch/react";
import { House } from "./House.js";

/**
 * The registration root. Each <Composition> registers a building the Studio
 * can visualise. Run \`npm run studio\` and edit House.tsx — the views update
 * live.
 */
export default function Root() {
  return (
    <>
      <Composition id="house" name="My House" component={House} />
    </>
  );
}
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

A [React Arch](https://react-arch.com) project — declarative building design.

## Develop

\`\`\`bash
npm install
npm run studio      # opens React Arch Studio for this project
\`\`\`

Edit \`src/House.tsx\` (or add buildings in \`src/Root.tsx\`) and the Studio's
2D / 3D / JSON views update live.
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
  npm run studio

Then edit src/House.tsx and watch the Studio update live.
`);
