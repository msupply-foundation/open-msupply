// The invoice-status-options display gate every invoice vertical applies to
// its status surfaces — list filter options, lifecycle indicator stages, and
// status-advance choices (each vertical's rules § preference gates). Display
// gates only: the server accepts a status the preference hides. Pure over a
// caller-supplied flow, so each vertical composes these with its own status
// sequence.
//
// Hiding a stage withdraws it from what a surface OFFERS. It never renames a
// record's status, and never hides where the record already is — nothing here
// maps one status onto another.

// Narrow `targets` (a flow, advance targets…) to the statuses the preference
// allows, keeping the targets' order. An EMPTY preference restricts nothing —
// the permissive default while the real value hasn't yet resolved (the
// standing safe-default precedent).
export const filterByStatusPreference = <S extends string>(
  targets: readonly S[],
  allowed: readonly string[]
): readonly S[] =>
  allowed.length === 0 ? targets : targets.filter(s => allowed.includes(s));

// The stages a lifecycle track shows: the allowed stages, PLUS the record's own
// current stage when the preference hides it. A hidden stage is one this store
// does not advance to — not a fact about a record already resting there, which
// the track still has to place (a transfer's Picked is set by the sending
// store, whatever the receiving store hides). Flow order is kept. An empty
// preference restricts nothing, as above.
export const trackStages = <S extends string>(
  flow: readonly S[],
  allowed: readonly string[],
  current: string
): readonly S[] =>
  allowed.length === 0
    ? flow
    : flow.filter(status => allowed.includes(status) || status === current);

// The current stage's index within the track's stages (trackStages, which
// always carries the current stage). −1 — no step marked — only for a status
// outside the flow entirely, as CANCELLED is.
export const currentStep = (
  stages: readonly string[],
  status: string
): number => stages.indexOf(status);
