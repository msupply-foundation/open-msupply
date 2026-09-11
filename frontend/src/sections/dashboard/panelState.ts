// A count family's fetch outcome → its panel's display state (spec/dashboard
// ui-surface S2): each panel owns its own loading / error state, so sibling
// panels are unaffected by one family failing.
//
// The forbidden outcome is the RESIDUAL permission path (contract.md §
// permission gates): a family the user cannot read is not requested at all and
// its panel is absent (OMS-REG-DB-01.60), so a Forbidden here means the
// permission went away while the screen was open. It still errors IN the panel,
// naming the permission problem, rather than tripping the global permission
// modal. Pure — the page resolves the message key through t() at render.

export type CountValue<T> =
  { kind: 'ready'; data: T } | { kind: 'forbidden' } | { kind: 'error' };

export type PanelDisplayState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; messageKey: 'error.no-permission' | 'error.no-data' };

export const countPanelState = <T>(
  current: CountValue<T> | undefined
): PanelDisplayState => {
  if (!current) return { status: 'loading' };
  if (current.kind === 'ready') return { status: 'ready' };
  return {
    status: 'error',
    messageKey:
      current.kind === 'forbidden' ? 'error.no-permission' : 'error.no-data',
  };
};
