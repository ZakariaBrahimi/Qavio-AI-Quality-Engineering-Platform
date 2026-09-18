/**
 * Qavio's AI reasoning layer — analyzing failures, suggesting fixes, and
 * verifying proposed fixes. Deliberately unimplemented in Phase 1: the
 * core architectural rule is that deterministic tools execute tests and
 * AI only reasons about the results, so this package cannot exist
 * meaningfully before workers/web produces real results to reason about.
 *
 * See docs/architecture.md ("Future Worker Architecture") for the planned
 * shape of this package.
 */
export const AI_PACKAGE_STATUS = 'not_implemented' as const;
