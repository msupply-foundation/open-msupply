// The invoice-status-options display gate every invoice vertical applies to
// its status surfaces — list filter options, lifecycle indicator stages, and
// status-advance choices (each vertical's rules § preference gates). Display
// gates only: the server accepts a status the preference hides. Pure over a
// caller-supplied flow, so each vertical composes these with its own status
// sequence.

// Narrow `targets` (a flow, advance targets…) to the statuses the preference
// allows, keeping the targets' order. An EMPTY preference restricts nothing —
// the permissive default while the real value hasn't yet resolved (the
// standing safe-default precedent).
export const filterByStatusPreference = <S extends string>(
  targets: readonly S[],
  allowed: readonly string[]
): readonly S[] =>
  allowed.length === 0 ? targets : targets.filter(s => allowed.includes(s));

// The lifecycle indicator's current stage within the OFFERED flow. When the
// preference hides the actual status, the current stage falls back to the
// nearest offered stage at-or-before it in the full flow (the current app's
// getPreviousStatus fallback). −1 when nothing at-or-before is offered —
// including a status outside the flow entirely.
export const currentStep = (
  flow: readonly string[],
  offered: readonly string[],
  status: string
): number => {
  const actual = flow.indexOf(status);
  return offered.findLastIndex(s => flow.indexOf(s) <= actual);
};
