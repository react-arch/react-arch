#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import { createInterface } from "node:readline/promises";
import path from "node:path";

const VERSION = "0.3.0";

// Pin to the published library line.
const RA = "^0.1.0";

// ── tiny ANSI helpers (no deps; respect NO_COLOR) ──────────────────────────
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const sgr = (n) => (s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : String(s));
const C = {
  cyan: sgr(36), dim: sgr(2), bold: sgr(1), green: sgr(32),
  red: sgr(31), yellow: sgr(33), magenta: sgr(35),
};
const Q = C.cyan(C.bold("?"));
const OK = C.green("✓");

// ── templates ──────────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "starter", label: "Starter", hint: "one floor, a few rooms — a good first read" },
  { id: "apartment", label: "Apartment", hint: "single-floor flat with a reusable bathroom module" },
  { id: "townhouse", label: "Townhouse", hint: "two storeys, stairs + hip roof" },
  { id: "empty", label: "Empty", hint: "a single room to start from scratch" },
];

const HOUSES = {
  empty: `import { Building, Door, Floor, Room, Window } from "@react-arch/react";

export function House() {
  return (
    <Building name="My Building" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="room" name="Room" x={0} y={0} width={5} depth={4} usage="living">
          <Door wall="south" offset={2.5} width={0.9} height={2.1} />
          <Window wall="north" offset={2.5} width={2.2} height={1.4} />
        </Room>
      </Floor>
    </Building>
  );
}
`,

  starter: `import { Building, Door, Floor, Room, Window, Fixture } from "@react-arch/react";

export function House() {
  return (
    <Building name="My House" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="living" name="Living Room" x={0} y={0} width={5} depth={4} usage="living">
          {/* Front door + an internal door onto the (shared) kitchen wall. */}
          <Door wall="south" offset={2.5} width={1} height={2.2} />
          <Door wall="east" offset={2} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.2} height={1.4} />
          <Fixture type="sofa" x={2.5} y={3.2} scaleX={1.3} />
          <Fixture type="table" x={2.5} y={1.6} />
        </Room>

        <Room id="kitchen" name="Kitchen" x={5} y={0} width={4} depth={4} usage="kitchen">
          {/* Reached through the living room's shared wall; just needs a window. */}
          <Window wall="north" offset={2} width={1.6} height={1.2} />
          <Fixture type="kitchen counter" x={7} y={0.5} scaleX={3} />
        </Room>
      </Floor>
    </Building>
  );
}
`,

  apartment: `import { Building, Door, Floor, Room, Window, Fixture } from "@react-arch/react";

/** A reusable module: any function that returns a <Room> can be placed anywhere. */
function Bathroom({ id, x, y }: { id: string; x: number; y: number }) {
  return (
    <Room id={id} name="Bathroom" x={x} y={y} width={2.4} depth={2.2} usage="wet">
      <Door wall="north" offset={1.2} width={0.8} height={2.1} />
      <Window wall="south" offset={1.2} width={0.8} height={1} />
      <Fixture type="toilet" x={x + 0.5} y={y + 1.7} />
      <Fixture type="sink" x={x + 1.5} y={y + 1.7} />
      <Fixture type="shower" x={x + 0.6} y={y + 0.6} />
    </Room>
  );
}

export function House() {
  return (
    <Building name="My Apartment" units="metric">
      <Floor id="flat" name="Apartment" elevation={0} height={2.7}>
        <Room id="living" name="Living / Dining" x={0} y={0} width={6} depth={5} usage="living">
          <Door wall="east" offset={2.5} width={0.9} height={2.1} />
          <Window wall="west" offset={2.5} width={2.6} height={1.5} />
          <Window wall="north" offset={3} width={2} height={1.5} />
          <Fixture type="sofa" x={1.6} y={4} scaleX={1.4} />
          <Fixture type="table" x={4} y={2.5} scaleX={1.3} />
        </Room>

        <Room id="kitchen" name="Kitchen" x={6} y={0} width={3.5} depth={3} usage="kitchen">
          <Door wall="south" offset={1.75} width={0.9} height={2.1} />
          <Window wall="north" offset={1.75} width={1.6} height={1.2} />
          <Fixture type="kitchen counter" x={7.7} y={0.5} scaleX={2.6} />
        </Room>

        <Room id="bedroom" name="Bedroom" x={0} y={5} width={4} depth={4} usage="sleeping">
          <Door wall="east" offset={2} width={0.9} height={2.1} />
          <Window wall="south" offset={2} width={2} height={1.5} />
          <Fixture type="bed" x={2} y={6.4} scaleX={1.6} scaleY={2} />
        </Room>

        <Bathroom id="bath" x={6} y={5.5} />
      </Floor>
    </Building>
  );
}
`,

  townhouse: `import { Building, Door, Floor, Roof, Room, Stairs, Window, Fixture } from "@react-arch/react";

export function House() {
  return (
    <Building name="My Townhouse" units="metric">
      {/* Ground floor: living spaces around a 3 m hall with the stair. */}
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="hall" name="Hall" x={4} y={0} width={3} depth={8} usage="hallway">
          <Door wall="south" offset={1.5} width={1} height={2.2} />
        </Room>

        {/* Centred stair with a 1 m landing on each side; climbs to the landing. */}
        <Stairs at={[5, 4]} direction="north" width={1} run={3.5} steps={16} />

        <Room id="living" name="Living Room" x={0} y={0} width={4} depth={8} usage="living">
          <Door wall="east" offset={4} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.4} height={1.5} />
          <Window wall="west" offset={6} width={2.4} height={1.5} />
          <Fixture type="sofa" x={1.4} y={6} scaleX={1.4} />
          <Fixture type="table" x={2} y={3} />
        </Room>

        <Room id="kitchen" name="Kitchen" x={7} y={0} width={4} depth={4} usage="kitchen">
          <Door wall="west" offset={2} width={0.9} height={2.1} />
          <Window wall="north" offset={2} width={1.8} height={1.2} />
          <Fixture type="kitchen counter" x={9} y={0.5} scaleX={3} />
        </Room>

        <Room id="dining" name="Dining" x={7} y={4} width={4} depth={4} usage="dining">
          <Door wall="west" offset={2} width={0.9} height={2.1} />
          <Window wall="south" offset={2} width={1.8} height={1.5} />
          <Fixture type="table" x={9} y={6} scaleX={1.6} scaleY={1.2} />
        </Room>
      </Floor>

      {/* First floor: bedrooms around the landing (the stairwell void). */}
      <Floor id="first" name="First Floor" elevation={2.8} height={2.7}>
        <Room id="landing" name="Landing" x={4} y={0} width={3} depth={8} usage="hallway">
          <Window wall="north" offset={1.5} width={1} height={1.2} />
        </Room>

        <Room id="master" name="Master Bedroom" x={0} y={0} width={4} depth={8} usage="sleeping">
          <Door wall="east" offset={4} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.4} height={1.4} />
          <Window wall="west" offset={6} width={2.4} height={1.4} />
          <Fixture type="bed" x={2} y={2} scaleX={1.7} scaleY={2} />
          <Fixture type="wardrobe" x={0.7} y={6} scaleX={1.4} />
        </Room>

        <Room id="bed-2" name="Bedroom 2" x={7} y={0} width={4} depth={4} usage="sleeping">
          <Door wall="west" offset={2} width={0.9} height={2.1} />
          <Window wall="north" offset={2} width={1.8} height={1.4} />
          <Fixture type="bed" x={9} y={1.4} scaleX={1.4} scaleY={2} />
        </Room>

        <Room id="bath" name="Bathroom" x={7} y={4} width={4} depth={4} usage="wet">
          <Door wall="west" offset={2} width={0.8} height={2.1} />
          <Window wall="south" offset={2} width={1} height={1} />
          <Fixture type="toilet" x={7.6} y={7.4} />
          <Fixture type="sink" x={8.6} y={7.4} />
          <Fixture type="shower" x={10} y={5} />
        </Room>
      </Floor>

      <Roof type="hip" pitch={35} overhang={0.4} />
    </Building>
  );
}
`,
};

// ── shared project files ─────────────────────────────────────────────────
function projectFiles(name, templateId) {
  return {
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
    ".gitignore": "node_modules/\ndist/\nreact-arch-out/\n.DS_Store\n",
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

// The full React Arch Studio — your code is the source of truth. Edit
// House.tsx and the 2D / 3D / JSON views update live (Vite HMR).
createRoot(document.getElementById("root")!).render(
  <div style={{ position: "fixed", inset: 0 }}>
    <Studio component={House} />
  </div>,
);
`,
    "src/House.tsx": HOUSES[templateId] ?? HOUSES.starter,
    "README.md": `# ${name}

A [React Arch](https://github.com/react-arch/react-arch) project — declarative
building design with React. Your code is the source of truth; the Studio is a
read-only visualizer.

\`\`\`bash
npm run dev      # open the React Arch Studio (2D / 3D / JSON, live reload)
\`\`\`

Edit \`src/House.tsx\`. For AI agents, install the skills:

\`\`\`bash
npx skills add react-arch/skills --all
\`\`\`
`,
  };
}

// ── prompts (interactive, no deps) ─────────────────────────────────────────
async function text(message, def) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const hint = def ? C.dim(` (${def})`) : "";
  const ans = (await rl.question(`${Q} ${message}${hint} `)).trim();
  rl.close();
  return ans || def;
}

async function confirm(message, def = true) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(`${Q} ${message} ${C.dim(def ? "(Y/n)" : "(y/N)")} `)).trim().toLowerCase();
  rl.close();
  if (!ans) return def;
  return ans[0] === "y";
}

function select(message, options, def = 0) {
  return new Promise((resolve) => {
    let i = def;
    const n = options.length;
    const draw = (first) => {
      if (!first) process.stdout.write(`\x1b[${n + 1}A`);
      process.stdout.write("\x1b[J");
      process.stdout.write(`${Q} ${message}  ${C.dim("(↑/↓, enter)")}\n`);
      options.forEach((o, idx) => {
        const active = idx === i;
        const head = active ? C.cyan("❯ " + o.label) : "  " + o.label;
        const hint = o.hint ? C.dim("  — " + o.hint) : "";
        process.stdout.write(`${head}${hint}\n`);
      });
    };
    draw(true);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onKey = (_, key) => {
      if (!key) return;
      if (key.name === "up" || key.name === "k") { i = (i - 1 + n) % n; draw(false); }
      else if (key.name === "down" || key.name === "j") { i = (i + 1) % n; draw(false); }
      else if (key.name === "return") { cleanup(); resolve(options[i].value); }
      else if (key.ctrl && key.name === "c") { cleanup(); process.exit(1); }
    };
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("keypress", onKey);
    };
    process.stdin.on("keypress", onKey);
  });
}

// ── package manager ─────────────────────────────────────────────────────────
function detectPM() {
  const ua = process.env.npm_config_user_agent || "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}
const runCmd = (pm) => (pm === "npm" ? "npm run" : pm); // `npm run dev` vs `pnpm dev`

// ── args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") o.help = true;
    else if (a === "-v" || a === "--version") o.version = true;
    else if (a === "-y" || a === "--yes") o.yes = true;
    else if (a === "-t" || a === "--template") o.template = argv[++i];
    else if (a.startsWith("--template=")) o.template = a.slice(11);
    else if (a === "--pm") o.pm = argv[++i];
    else if (a.startsWith("--pm=")) o.pm = a.slice(5);
    else if (a === "--no-install") o.install = false;
    else if (a === "--install") o.install = true;
    else if (a === "--no-git") o.git = false;
    else if (a === "--git") o.git = true;
    else if (a === "--skills") o.skills = true;
    else if (a === "--no-skills") o.skills = false;
    else if (!a.startsWith("-")) o._.push(a);
  }
  return o;
}

const HELP = `
${C.bold("create-react-arch-app")} — scaffold a React Arch project

${C.bold("Usage")}
  npm create react-arch-app@latest [name] [options]
  npx create-react-arch-app [name] [options]

${C.bold("Options")}
  -t, --template <id>   ${TEMPLATES.map((t) => t.id).join(" | ")}
      --pm <pm>         npm | pnpm | yarn | bun (auto-detected)
      --no-install      skip installing dependencies
      --no-git          skip git init
      --skills          install the React Arch agent skills
  -y, --yes             accept defaults, no prompts
  -h, --help            show this help
  -v, --version         print version
`;

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.version) { console.log(VERSION); return; }
  if (opts.help) { console.log(HELP); return; }

  const interactive = process.stdin.isTTY && !opts.yes;

  console.log(`\n  ${C.magenta(C.bold("React Arch"))} ${C.dim("· create a new project")}\n`);

  // name
  let targetArg = opts._[0];
  if (!targetArg) {
    targetArg = interactive ? await text("Project name?", "my-building") : "my-building";
  }
  const dir = path.resolve(process.cwd(), targetArg);
  const name = path.basename(dir).replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-building";

  if (existsSync(dir)) {
    const stat = statSync(dir);
    if (!stat.isDirectory()) fail(`Target path "${targetArg}" exists and is not a directory.`);
    if (readdirSync(dir).length > 0) fail(`Target directory "${targetArg}" exists and is not empty.`);
  }

  // template
  let templateId = opts.template;
  if (templateId && !HOUSES[templateId]) fail(`Unknown template "${templateId}". Choose: ${TEMPLATES.map((t) => t.id).join(", ")}`);
  if (!templateId) {
    templateId = interactive
      ? await select("Template?", TEMPLATES.map((t) => ({ label: t.label, hint: t.hint, value: t.id })), 0)
      : "starter";
  }

  // package manager
  const pm = opts.pm || detectPM();

  // install / git / skills
  const install = opts.install ?? (interactive ? await confirm("Install dependencies now?", true) : true);
  const git = opts.git ?? (interactive ? await confirm("Initialize a git repository?", true) : true);
  const skills = opts.skills ?? (interactive ? await confirm("Install the React Arch agent skills?", false) : false);

  // write files
  const files = projectFiles(name, templateId);
  mkdirSync(dir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  console.log(`\n  ${OK} Created ${C.bold(name)} ${C.dim(`(${templateId} template)`)} in ${path.relative(process.cwd(), dir) || "."}`);

  if (git) step("Initializing git", () => run("git", ["init", "-q"], dir) && run("git", ["add", "-A"], dir));
  if (install) step(`Installing dependencies with ${pm}`, () => run(pm, ["install"], dir, true));
  if (skills) step("Installing agent skills", () => run("npx", ["-y", "skills@latest", "add", "react-arch/skills", "--all"], dir, true));

  // next steps
  const relDir = path.relative(process.cwd(), dir) || ".";
  const run1 = runCmd(pm);
  console.log(`\n  ${C.green(C.bold("Done!"))} Next steps:\n`);
  if (relDir !== ".") console.log(`    ${C.cyan(`cd ${relDir}`)}`);
  if (!install) console.log(`    ${C.cyan(`${pm} install`)}`);
  console.log(`    ${C.cyan(`${run1} dev`)}      ${C.dim("# open the Studio (2D / 3D / JSON)")}`);
  if (!skills) console.log(`\n  ${C.dim("For AI agents:")} ${C.cyan("npx skills add react-arch/skills --all")}`);
  console.log("");
}

function step(label, fn) {
  process.stdout.write(`  ${C.dim("•")} ${label}…`);
  try {
    const ok = fn();
    process.stdout.write(`\r  ${OK} ${label}    \n`);
    return ok;
  } catch {
    process.stdout.write(`\r  ${C.yellow("!")} ${label} — skipped\n`);
    return false;
  }
}

function run(cmd, args, cwd, inheritOnFail = false) {
  const r = spawnSync(cmd, args, { cwd, stdio: inheritOnFail ? ["ignore", "ignore", "ignore"] : "ignore", shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}`);
  return true;
}

function fail(msg) {
  console.error(`\n  ${C.red("✗")} ${msg}\n`);
  process.exit(1);
}

main().catch((e) => fail(e?.message || String(e)));
