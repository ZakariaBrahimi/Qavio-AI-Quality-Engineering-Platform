## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

**Qavio-specific rules for using this graph** (see `docs/graphify.md` for the full writeup):
- The graph is a navigation aid, not a source of truth. For anything that matters — a claim about behavior, a security control, an API shape — verify against the actual file before relying on it.
- Source code is authoritative for application behavior. Database migrations under `supabase/migrations/` are authoritative for schema/RLS. Deployed configuration (Railway, Vercel, Supabase project settings) is authoritative for how production actually behaves — the graph only reflects what's committed to this repo.
- Treat `INFERRED` and `AMBIGUOUS` edges in the graph as hypotheses to check, not facts.
- Never feed graph content back into a decision about secrets or credentials. Graphify never ingests `.env*`, keys, or credentials from this repo (see `docs/graphify.md`'s security section) — if a query result ever looks like it contains one, stop and report it rather than trusting it.
