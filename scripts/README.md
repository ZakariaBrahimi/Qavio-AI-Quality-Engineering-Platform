# scripts

One-off developer scripts that don't belong inside any single workspace.

- `clean-all.sh` — removes every `node_modules`, `dist`, `.next`, and
  `.turbo` directory in the monorepo. Use when `pnpm clean` isn't enough
  (e.g. after switching branches with very different dependency trees).
