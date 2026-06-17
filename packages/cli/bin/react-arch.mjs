#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);

const VERSION = "0.1.0";
const HELP = `
React Arch — AI writes architecture-as-code; React Arch validates & visualises it.

Usage
  react-arch studio  [entry]        Launch the Studio (visualizer) for your project
  react-arch check   [entry]        Render → validate → export → report (for agents/CI)
  react-arch compare [entries...]   Score and rank building variants

Options (studio)
  -p, --port <number>            Port to serve the Studio on (default 5173)
  -o, --open                     Open the Studio in your browser

Options (check)
  --out <dir>                    Output directory (default react-arch-out)
  --brief <file.json>            Check the model against a DesignBrief
  --svg                          Also export an SVG floor plan
  --glb                          Also export a GLB model
  --json                         Print the combined report as JSON to stdout

Options (compare)
  --out <dir>                    Output directory (default react-arch-out)
  --json                         Print the comparison as JSON to stdout

Common
  -v, --version                  Print version
  -h, --help                     Show this help

[entry] defaults to one of: src/Root.tsx, src/root.tsx, src/House.tsx,
src/index.tsx, src/index.ts. \`check\` exits non-zero when there are errors.
\`compare\` treats every exported building component (across all entries) as a
variant — give it several components or several files.
`;

function parse(args) {
  const out = { _: [], open: false, svg: false, glb: false, json: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-v" || a === "--version") out.version = true;
    else if (a === "-o" || a === "--open") out.open = true;
    else if (a === "-p" || a === "--port") out.port = args[++i];
    else if (a.startsWith("--port=")) out.port = a.slice(7);
    else if (a === "--out") out.out = args[++i];
    else if (a.startsWith("--out=")) out.out = a.slice(6);
    else if (a === "--brief") out.brief = args[++i];
    else if (a.startsWith("--brief=")) out.brief = a.slice(8);
    else if (a === "--svg") out.svg = true;
    else if (a === "--glb") out.glb = true;
    else if (a === "--json") out.json = true;
    else out._.push(a);
  }
  return out;
}

const DEFAULT_ENTRIES = ["src/Root.tsx", "src/root.tsx", "src/House.tsx", "src/index.tsx", "src/index.ts"];
function resolveEntry(arg) {
  if (arg) {
    const p = path.resolve(process.cwd(), arg);
    return existsSync(p) ? p : null;
  }
  for (const c of DEFAULT_ENTRIES) {
    const p = path.resolve(process.cwd(), c);
    if (existsSync(p)) return p;
  }
  return null;
}

const opts = parse(argv);
if (opts.version) { console.log(VERSION); process.exit(0); }
if (opts.help || opts._.length === 0) { console.log(HELP); process.exit(0); }

const command = opts._[0];

if (command === "compare") {
  const args = opts._.slice(1);
  const entries = (args.length ? args : [undefined]).map((a) => {
    const e = resolveEntry(a);
    if (!e) {
      console.error(`Could not find entry${a ? ` "${a}"` : ""}. Pass entry files, or create one of: ${DEFAULT_ENTRIES.join(", ")}`);
      process.exit(1);
    }
    return e;
  });
  const { runCompare } = await import(new URL("../check.mjs", import.meta.url));
  process.exit(await runCompare({ entries, out: opts.out, json: opts.json }));
}

const entry = resolveEntry(opts._[1]);
if (!entry) {
  console.error(`Could not find a building entry. Pass one explicitly, or create one of: ${DEFAULT_ENTRIES.join(", ")}`);
  process.exit(1);
}

if (command === "check") {
  const { runCheck } = await import(new URL("../check.mjs", import.meta.url));
  const code = await runCheck({ entry, out: opts.out, brief: opts.brief, svg: opts.svg, glb: opts.glb, json: opts.json });
  process.exit(code);
}

if (command !== "studio") {
  console.error(`Unknown command: ${command}\n${HELP}`);
  process.exit(1);
}

// --- studio ---------------------------------------------------------------
let studioDir;
try {
  studioDir = path.dirname(require.resolve("@react-arch/studio-app/package.json"));
} catch {
  console.error(
    "`react-arch studio` ships a live bundler that isn't part of the published\n" +
      "CLI yet. Render the Studio in your own app with the `<Studio>` component\n" +
      "from `@react-arch/studio`, or run it from the React Arch repo.\n" +
      "`react-arch check` works everywhere — use that for validation.",
  );
  process.exit(1);
}
const binName = process.platform === "win32" ? "vite.cmd" : "vite";
const viteBin = [
  path.join(studioDir, "node_modules", ".bin", binName),
  path.join(studioDir, "..", "..", "node_modules", ".bin", binName),
].find((p) => existsSync(p));
if (!viteBin) {
  console.error("Could not find the Vite binary shipped with the Studio.");
  process.exit(1);
}

console.log(`React Arch Studio → ${path.relative(process.cwd(), entry) || entry}`);
const child = spawn(viteBin, [...(opts.port ? ["--port", String(opts.port)] : [])], {
  cwd: studioDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    RA_ROOT: entry,
    RA_PROJECT: process.cwd(),
    ...(opts.port ? { RA_PORT: String(opts.port) } : {}),
    ...(opts.open ? { RA_OPEN: "1" } : {}),
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
