#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);

const VERSION = "0.1.0";
const HELP = `
React Arch — declarative building design for the web

Usage
  react-arch studio [entry]      Launch the Studio (visualizer) for your project

Options
  -p, --port <number>            Port to serve the Studio on (default 5173)
  -o, --open                     Open the Studio in your browser
  -v, --version                  Print version
  -h, --help                     Show this help

The [entry] is a file that default-exports your registration Root — a component
rendering <Composition id name component /> entries. If omitted, react-arch looks
for one of: src/Root.tsx, src/root.tsx, src/index.tsx, src/index.ts.

Example
  npx react-arch studio src/Root.tsx --port 4000 --open
`;

function parse(args) {
  const out = { _: [], port: undefined, open: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-v" || a === "--version") out.version = true;
    else if (a === "-o" || a === "--open") out.open = true;
    else if (a === "-p" || a === "--port") out.port = args[++i];
    else if (a.startsWith("--port=")) out.port = a.slice(7);
    else out._.push(a);
  }
  return out;
}

const opts = parse(argv);
if (opts.version) { console.log(VERSION); process.exit(0); }
if (opts.help || opts._.length === 0) { console.log(HELP); process.exit(0); }

const command = opts._[0];
if (command !== "studio") {
  console.error(`Unknown command: ${command}\n${HELP}`);
  process.exit(1);
}

// Resolve the entry (positional after "studio", or a conventional default).
const candidates = ["src/Root.tsx", "src/root.tsx", "src/index.tsx", "src/index.ts"];
let entry = opts._[1];
if (!entry) {
  entry = candidates.find((c) => existsSync(path.resolve(process.cwd(), c)));
}
if (!entry) {
  console.error(
    "Could not find a building entry. Pass one explicitly:\n" +
      "  react-arch studio src/Root.tsx\n" +
      `Or create one of: ${candidates.join(", ")}`,
  );
  process.exit(1);
}
const entryPath = path.resolve(process.cwd(), entry);
if (!existsSync(entryPath)) {
  console.error(`Entry not found: ${entryPath}`);
  process.exit(1);
}

// Locate the Studio app and the Vite binary it ships with.
let studioDir;
try {
  studioDir = path.dirname(require.resolve("@react-arch/studio/package.json"));
} catch {
  console.error("Could not resolve @react-arch/studio. Is react-arch installed correctly?");
  process.exit(1);
}
// Vite ships with the Studio; use its .bin shim (rolldown-vite's exports map
// blocks resolving bin/vite.js directly).
const binName = process.platform === "win32" ? "vite.cmd" : "vite";
const binCandidates = [
  path.join(studioDir, "node_modules", ".bin", binName),
  path.join(studioDir, "..", "..", "node_modules", ".bin", binName), // hoisted
];
const viteBin = binCandidates.find((p) => existsSync(p));
if (!viteBin) {
  console.error("Could not find the Vite binary shipped with the Studio.");
  process.exit(1);
}

console.log(`React Arch Studio → ${path.relative(process.cwd(), entryPath) || entryPath}`);

const child = spawn(
  viteBin,
  [...(opts.port ? ["--port", String(opts.port)] : [])],
  {
    cwd: studioDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      RA_ROOT: entryPath,
      RA_PROJECT: process.cwd(),
      ...(opts.port ? { RA_PORT: String(opts.port) } : {}),
      ...(opts.open ? { RA_OPEN: "1" } : {}),
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
