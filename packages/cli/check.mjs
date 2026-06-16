import { pathToFileURL } from "node:url";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const C = { red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m", green: "\x1b[32m", bold: "\x1b[1m", reset: "\x1b[0m" };
const sevColor = { error: C.red, warning: C.yellow, info: C.cyan };

function slug(s) {
  return (s || "building").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "building";
}

function printReport(name, report) {
  const { counts } = report;
  const head = report.ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  console.log(`\n${head} ${C.bold}${name}${C.reset} ${C.gray}— ${report.summary.floors} floor(s), ${report.summary.rooms} room(s), ${report.schedule.totalAreaM2} m²${C.reset}`);
  console.log(`  ${C.red}${counts.error} error${C.reset}  ${C.yellow}${counts.warning} warning${C.reset}  ${C.cyan}${counts.info} info${C.reset}`);
  for (const d of report.diagnostics) {
    const col = sevColor[d.severity] || C.gray;
    console.log(`  ${col}${d.severity}${C.reset} ${C.gray}[${d.code}]${C.reset} ${d.message}`);
    if (d.fix) console.log(`      ${C.gray}↳ ${d.fix}${C.reset}`);
  }
}

function pickComponents(entryNs) {
  const out = [];
  const seen = new Set();
  const add = (name, fn) => {
    if (typeof fn === "function" && !seen.has(fn)) {
      seen.add(fn);
      out.push({ name: fn.displayName || fn.name || name, component: fn });
    }
  };
  if (entryNs.default) add("default", entryNs.default);
  for (const [k, v] of Object.entries(entryNs)) {
    if (k !== "default" && /^[A-Z]/.test(k)) add(k, v);
  }
  return out;
}

/**
 * Bundle a tiny shim (React Arch APIs + the user's entry) with esbuild so we
 * control the JSX transform and keep react/react-reconciler/three external (one
 * shared instance). Returns the loaded module namespace.
 */
async function loadBundle(entryPath, cwd) {
  const esbuild = await import("esbuild");
  const cliDir = path.dirname(new URL(import.meta.url).pathname);

  // Pin react + the @react-arch/* packages to the copies this CLI ships, so the
  // bundle is self-contained (resolves nothing from cwd) and React isn't
  // duplicated (one instance → hooks + reconciliation work).
  const alias = {};
  for (const name of [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-reconciler",
    "scheduler",
    "@react-arch/react",
    "@react-arch/core",
    "@react-arch/geometry",
    "@react-arch/shared",
    "@react-arch/validation",
    "@react-arch/exporters",
  ]) {
    try {
      alias[name] = require.resolve(name);
    } catch {
      /* not resolvable from CLI; leave to default resolution */
    }
  }

  const shim = [
    `export { renderToDocument } from "@react-arch/react";`,
    `export { review, DesignBriefSchema } from "@react-arch/validation";`,
    `export { exportJSON, exportSVG } from "@react-arch/exporters";`,
    `export { createElement } from "react";`,
    `import * as __entry from ${JSON.stringify(entryPath)};`,
    `export const Entry = __entry;`,
  ].join("\n");

  const result = await esbuild.build({
    stdin: { contents: shim, resolveDir: cliDir, loader: "ts", sourcefile: "react-arch-check-shim.ts" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    jsxImportSource: "react",
    logLevel: "silent",
    alias,
    // 3D-only deps; reached solely by --glb (handled with try/catch).
    external: ["three", "three/*", "@react-three/fiber", "@react-three/drei"],
  });

  const tmp = path.join(tmpdir(), `react-arch-check.${process.pid}.mjs`);
  writeFileSync(tmp, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    rmSync(tmp, { force: true });
  }
}

export async function runCheck(opts) {
  const cwd = process.cwd();
  const entryPath = opts.entry;
  const outDir = path.resolve(cwd, opts.out ?? "react-arch-out");

  let bundle;
  try {
    bundle = await loadBundle(entryPath, cwd);
  } catch (err) {
    console.error(`Failed to load ${path.relative(cwd, entryPath)}: ${err?.message ?? err}`);
    return 1;
  }

  const components = pickComponents(bundle.Entry);
  if (components.length === 0) {
    console.error("No building components found. Export a building component (default or named).");
    return 1;
  }

  let brief;
  if (opts.brief) {
    brief = bundle.DesignBriefSchema.parse(JSON.parse(readFileSync(path.resolve(cwd, opts.brief), "utf8")));
  }

  mkdirSync(outDir, { recursive: true });
  const buildings = [];
  let hadError = false;

  for (const { name, component } of components) {
    let doc;
    try {
      doc = bundle.renderToDocument(bundle.createElement(component), name);
    } catch (err) {
      console.error(`Failed to render ${name}: ${err?.message ?? err}`);
      hadError = true;
      continue;
    }
    if (!doc.buildings.length || doc.buildings.every((b) => b.floors.length === 0)) continue;

    const report = bundle.review(doc, { brief });
    if (!report.ok) hadError = true;

    const base = slug(name);
    writeFileSync(path.join(outDir, `${base}.model.json`), bundle.exportJSON(doc));
    writeFileSync(path.join(outDir, `${base}.report.json`), JSON.stringify(report, null, 2));
    if (opts.svg) writeFileSync(path.join(outDir, `${base}.plan.svg`), bundle.exportSVG(doc));
    if (opts.glb) {
      console.error(`  ${C.gray}(GLB export isn't supported in \`check\` yet — use the Studio's export.)${C.reset}`);
    }
    buildings.push({ name, report });
    printReport(name, report);
  }

  if (buildings.length === 0) {
    console.error("No buildings rendered.");
    return 1;
  }

  const combined = { buildings: buildings.map((b) => ({ name: b.name, ...b.report })) };
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(combined, null, 2));
  if (opts.json) console.log(JSON.stringify(combined, null, 2));
  console.log(`\n${C.gray}Wrote report + artifacts to ${path.relative(cwd, outDir) || outDir}/${C.reset}`);
  return hadError ? 1 : 0;
}

void existsSync;
