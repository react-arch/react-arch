# create-react-arch-app

## 0.3.0

### Minor Changes

- 3540fc9: Rework the scaffolder into a Remotion-style experience built on `@clack/prompts`. `npm create react-arch-app` now runs an interactive TUI (project name → template → install deps → git init → agent skills) with spinners, detects the package manager (npm/pnpm/yarn/bun), and can run fully non-interactively with flags (`--template`, `--pm`, `--no-install`, `--no-git`, `--skills`, `-y`). It actually installs dependencies, inits git, and (optionally) installs the React Arch agent skills, then prints clear next steps. Four templates ship — starter, apartment, townhouse (two storeys + stairs + hip roof), and empty — all validate clean.

## 0.2.1

### Patch Changes

- 73552ee: Apply the React Arch brand to the renderers (selection highlight accent #2563EB)
  and ship the shared, embeddable `@react-arch/studio` Studio component used by both
  the dev shell and `create-react-arch-app`.
