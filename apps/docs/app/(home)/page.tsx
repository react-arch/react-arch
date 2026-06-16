import Link from 'next/link';

const sample = `import { Building, Floor, Room, Door, Window } from "@react-arch/react";

export function House() {
  return (
    <Building name="Modern House" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="living" name="Living Room" x={0} y={0} width={5} depth={4}>
          <Door wall="south" offset={1} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.2} height={1.4} />
        </Room>
      </Floor>
    </Building>
  );
}`;

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/react-arch-mark.svg" alt="React Arch" width={64} height={64} className="mb-5" />
      <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Design spaces in code
      </h1>
      <p className="mb-8 max-w-2xl text-fd-muted-foreground">
        Build floor plans and architectural models with React and TypeScript.
        Your code is the source of truth; React Arch derives a semantic model and
        renders it as a 2D plan, a 3D model, and exports.
      </p>
      <div className="mb-10 flex gap-3">
        <Link
          href="/docs"
          className="rounded-md bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
        >
          Get started
        </Link>
        <Link
          href="/docs/quick-start"
          className="rounded-md border border-fd-border px-5 py-2.5 font-medium"
        >
          Quick start
        </Link>
      </div>
      <pre className="max-w-2xl overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4 text-left text-sm">
        <code>{sample}</code>
      </pre>
    </main>
  );
}
