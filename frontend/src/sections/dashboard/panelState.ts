// A count family's fetch outcome → its panel's display state (spec/dashboard
// ui-surface S2, AC-D2): each panel owns its own loading / error state; a
// family the user cannot read errors IN the panel (naming the permission
// problem) rather than tripping the global permission modal, so sibling
// panels are unaffected. Pure — the page resolves the message key through
// t() at render.

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
