---
"create-react-arch-app": minor
---

Rework the scaffolder into a Remotion-style experience built on `@clack/prompts`. `npm create react-arch-app` now runs an interactive TUI (project name → template → install deps → git init → agent skills) with spinners, detects the package manager (npm/pnpm/yarn/bun), and can run fully non-interactively with flags (`--template`, `--pm`, `--no-install`, `--no-git`, `--skills`, `-y`). It actually installs dependencies, inits git, and (optionally) installs the React Arch agent skills, then prints clear next steps. Four templates ship — starter, apartment, townhouse (two storeys + stairs + hip roof), and empty — all validate clean.
