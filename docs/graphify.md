# graphify

Qavio uses [graphify](https://github.com/Graphify-Labs/graphify) (open source,
MIT-licensed) to turn this repository into a queryable knowledge graph, so a
Claude Code session — or a developer — can answer architecture questions
without re-scanning the whole monorepo on every question.

## 1. Why Qavio uses it

Qavio is a large, multi-package monorepo (`apps/`, `workers/`, `packages/`,
`supabase/migrations/`, `docs/`) with real cross-cutting relationships: the
control plane (`apps/web`) enqueues jobs consumed by the execution plane
(`workers/web`), both talk to the same Supabase schema, and several `docs/*.md`
files describe design decisions that aren't visible from the code alone.
Grepping for a symbol finds occurrences; it doesn't show that
`RoutingTestExecutor` routes to `PlaywrightTestExecutor` for `web` projects
and `PlaceholderTestExecutor` otherwise, or that `docs/phase-7-completion.md`
and `workers/web/src/executors/playwright-executor.ts` describe the same
component. graphify's community detection and cross-file edges surface that
structure directly.

## 2. Installation

Installed once, machine-wide, via the official method (not the generic
`npx skills add` one-liner — this repo ships `graphify/skill.md`, and the
generic installer expects an uppercase `SKILL.md`, so it doesn't find it):

```bash
uv tool install graphifyy       # or: pipx install graphifyy
uv tool install --with 'graphifyy[sql]' --force graphifyy   # + SQL parsing for supabase/migrations/*.sql
graphify install                # registers the /graphify skill with Claude Code
```

This installs two executables (`graphify`, `graphify-mcp`) and the skill
itself, plus its reference docs, under `~/.claude/skills/graphify/` —
available to any Claude Code session on that machine, not just this repo.

**Not installed in this repo, on purpose:** `graphify claude install` (the
command that writes the CLAUDE.md section *and* a Claude Code `PreToolUse`
hook in one step) and `graphify hook install` (git post-commit/post-checkout
hooks that auto-rebuild the graph). Both install code that runs automatically
on every future tool call or commit without further review, and installing
them was explicitly blocked by this environment's own auto-mode policy as
"Untrusted Code Integration." The CLAUDE.md section below was added by hand
instead (see §6), using graphify's own official template
(`graphify/always_on/claude-md.md` in the graphify repo) verbatim. If your
team wants the auto-rebuild hook, run `graphify hook install` yourself,
per-clone — hooks live in `.git/hooks/`, which is never versioned, so this is
inherently a local, individual opt-in, not something to install on the
team's behalf from one session.

## 3. Building / updating the graph

```bash
graphify update .        # after code changes — AST-only, no LLM, fast
graphify extract . --force   # full rebuild (rarely needed)
```

Inside a Claude Code session, `/graphify .` runs the full pipeline
interactively: local tree-sitter AST extraction for code (deterministic, no
API key, nothing leaves the machine), plus a semantic pass over
docs/images — which uses Gemini only if `GEMINI_API_KEY`/`GOOGLE_API_KEY` is
already set, and otherwise falls back to the host agent itself (Claude, via
dispatched subagents reading the files directly). graphify never reads
`ANTHROPIC_API_KEY` or any other provider key, and no repository content is
sent to any external graphify service — `app.graphify.com` is a separate,
unrelated commercial product this integration does not use.

## 4. What's included

Everything graphify's own file-type detection classifies as code, doc,
paper, or image, filtered through `.gitignore` (respected automatically) —
in this repo: `apps/*`, `workers/*`, `packages/*` TypeScript/TSX source,
`supabase/migrations/*.sql`, `package.json`/`tsconfig.json`/config files,
`docs/*.md`, the root `README.md`, per-package `README.md` files, and
`apps/web/src/app/icon.svg`. 368 files, ~90k words as of the last build.

## 5. What's excluded

- Everything `.gitignore` already excludes: `node_modules/`, `.next/`,
  `dist/`, `build/`, `.turbo/`, `coverage/`, `playwright-report/`,
  `test-results/`, `.env*` (except `.env.example`, which graphify's own
  file-type detector further classifies as "unclassified" and never ingests
  content from anyway).
- `.git/`, lockfiles (`pnpm-lock.yaml`).
- Anything graphify's own sensitive-file heuristic flags (checked on every
  build — see §9; none were flagged in this repo).

Add a `.graphifyignore` (same syntax as `.gitignore`) if something else
needs excluding later — it merges with `.gitignore` and only ever excludes
more.

## 6. How Claude Code uses this

A `## graphify` section in the repo's `CLAUDE.md` (graphify's own official
template, copied by hand for the reason in §2) tells Claude to run
`graphify query "<question>"` / `graphify path "<A>" "<B>"` /
`graphify explain "<concept>"` before grepping for an architecture question,
and to run `graphify update .` after modifying code. Qavio adds its own
source-of-truth caveats directly underneath that section (see the file
itself) — summarized in §10 below.

## 7. When to refresh the graph

- **After any code change**: run `graphify update .` (AST-only, incremental,
  no LLM cost) before relying on the graph for a question in the same
  session.
- **After adding/editing a doc** (`docs/*.md`, READMEs): the git hook (if a
  developer opts into it) only re-extracts code; docs need
  `graphify update .` run explicitly, or a fresh `/graphify .`.
- **No automatic hook is installed in this repo** (see §2) — the graph can
  go stale relative to `HEAD` between manual updates. Treat a graph query's
  answer as current only up to the last time someone ran `update`, and
  verify anything load-bearing against the actual file.

## 8. Inspecting / querying the graph

```bash
graphify god-nodes                          # most-connected files/symbols
graphify query "How does a Test Run get enqueued?"
graphify path "TestRunStatusPanel" "BullMQ"
graphify explain "PlaywrightTestExecutor"
```

Or open `graphify-out/graph.html` directly in a browser for the interactive,
zoomable view — no server needed. `graphify-out/GRAPH_REPORT.md` has the
human-readable summary (god nodes, communities, surprising connections).

## 9. Security considerations

- graphify is a local development tool. Code parsing is 100% local
  (tree-sitter AST) — no network calls, no LLM, no API key, for the
  `code`-classified files that make up the bulk of this repo (344 of 368
  files at last build).
- The semantic pass over docs/images, when it runs, either uses a
  Gemini key you explicitly set (not done here) or the current session's own
  model via dispatched subagents — never a separate external call this
  integration configured.
- Every file graphify would ingest is filtered through `.gitignore` first
  (see §5); this repo's `.gitignore` already excludes every secret-bearing
  path (`.env*`, credentials, private keys never existed in this repo to
  begin with).
- Before committing a rebuilt graph, re-run the check below (it's what
  produced a clean result for the current `graphify-out/`):
  ```bash
  grep -oE "eyJ[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_]+|sk-[A-Za-z0-9]{20,}|postgres(ql)?://[^\"' ]*:[^\"' @]*@|redis://[^\"' ]*:[^\"' @]*@|-----BEGIN [A-Z ]*PRIVATE KEY-----" \
    graphify-out/graph.json graphify-out/GRAPH_REPORT.md
  find graphify-out/cache -name '*.json' -print0 | xargs -0 grep -l "<same pattern>"
  ```
  Both should produce no matches. Also spot-check
  `graphify-out/graph.json`'s `source_file` fields never point at `.env*`,
  a credential, or a key file.
- We did **not** install the automated `graphify claude install` /
  `graphify hook install` mechanisms (see §2) — nothing in this repo
  auto-executes on a future tool call or commit as a result of this
  integration.
- `app.graphify.com` (a separate, early-access commercial platform by the
  same maintainers) is not used, connected, or authenticated against by
  anything in this repo.

## 10. Source-of-truth rules

The graph is a navigation aid, not a source of truth:

- **Source code** is authoritative for application behavior.
- **`supabase/migrations/*.sql`** is authoritative for schema and RLS —
  never the graph's summary of a table.
- **Deployed configuration** (Railway, Vercel, the live Supabase project's
  own dashboard settings) is authoritative for how production actually
  behaves; the graph only reflects what's committed to this repo.
- Every graph edge is tagged `EXTRACTED` (read directly from source),
  `INFERRED` (graphify's own inference), or `AMBIGUOUS`. Treat `INFERRED`
  and `AMBIGUOUS` edges as hypotheses to verify, not facts — `EXTRACTED`
  edges are reliable but still worth a spot-check for anything load-bearing.
- Community labels (e.g. "Queue Producer/Consumer") are a navigation
  grouping, not a formal architectural boundary this codebase enforces
  anywhere.

## 11. Troubleshooting

- **`No valid skills found` from `npx skills add Graphify-Labs/graphify`**:
  expected — use `uv tool install graphifyy` + `graphify install` instead
  (see §2).
- **`graphify: command not found`**: the `uv tool install` bin dir
  (`~/.local/bin` by default) isn't on `PATH` in the current shell.
- **`ModuleNotFoundError: No module named 'graphify'` when invoking
  `python3` directly**: `uv tool install` creates an isolated venv; resolve
  the right interpreter with
  `uv tool run --from graphifyy python -c "import sys; print(sys.executable)"`
  rather than assuming the system `python3`.
- **SQL migrations parsed as 0 nodes / "tree_sitter_sql not installed"
  warning**: run
  `uv tool install --with 'graphifyy[sql]' --force graphifyy` (see §2) and
  re-run the build.
- **`graphify query` truncates results**: pass `--budget N` for a larger
  token cap, or narrow with `graphify explain "<specific symbol>"` /
  `graphify path "A" "B"` instead of a broad `query`.
- **A query's answer looks wrong**: verify against the actual file
  (`source_file`/`source_location` on the node or edge) before trusting it —
  see §10. If it's genuinely wrong, the graph may be stale; run
  `graphify update .`.
