/*
 * vanilla-extract equivalent of Combobox.module.css — a reading exercise, not
 * wired up. Each `.class` becomes an exported `style()` const; consumers do
 * `import * as styles from './Combobox.css'` and every `styles.x` reference is
 * unchanged, but now type-checked (a missing class is a compile error).
 *
 * Faithful port: token references stay as raw `var(--…)` strings, so the emitted
 * CSS is byte-identical to the module. With a typed theme contract those would
 * become `vars.*` (e.g. `var(--space-2)` → `vars.space.s2`) and get checked too.
 *
 * Two VE-specific structural notes vs. the plain CSS:
 *  - `.clear, .toggle { … }` (a shared rule) becomes a private `controlButton`
 *    base composed into both via `style([base, { …overrides }])`.
 *  - The single `@media (pointer: coarse)` block that styled two classes is
 *    distributed: each style carries its own `@media` key. Media queries in VE
 *    are per-style, not standalone blocks.
 */
import { style } from '@vanilla-extract/css';

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  minWidth: 0,
  maxWidth: 'var(--input-max-long)',
});

export const label = style({
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-medium)',
  lineHeight: 1.3,
  color: 'var(--text-body)',
});

export const control = style({
  display: 'flex',
  alignItems: 'center',
  height: 'var(--input-height)',
  border: '1px solid var(--input-border)',
  borderRadius: 'var(--input-radius)',
  background: 'var(--bg-white)',
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
  // Simple pseudo → top-level key, no `selectors` block needed.
  ':focus-within': {
    borderColor: 'var(--primary-main)',
    boxShadow: 'var(--focus-ring)',
  },
  '@media': {
    '(pointer: coarse)': { minHeight: 'var(--touch-target)' },
  },
});

export const searchIcon = style({
  display: 'inline-flex',
  marginInlineStart: 'var(--input-padding-x)',
  color: 'var(--gray-main)',
  fontSize: '1rem',
  flexShrink: 0,
});

export const input = style({
  flex: 1,
  minWidth: 0,
  height: '100%',
  paddingInline: 'var(--space-2)',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-body)',
  fontFamily: 'inherit',
  fontSize: 'var(--text-sm)',
  ':focus': { outline: 'none' },
  '::placeholder': { color: 'var(--gray-main)' },
});

/*
 * Private shared base for the two icon buttons (the `.clear, .toggle` rule).
 * Not exported — it only exists to be composed below.
 */
const controlButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  paddingInline: 'var(--space-2)',
  border: 'none',
  background: 'transparent',
  color: 'var(--gray-dark)',
  cursor: 'pointer',
});

export const clear = style([
  controlButton,
  {
    fontSize: '1rem',
    color: 'var(--gray-main)', // overrides the base's gray-dark (later in the array wins)
    ':hover': { color: 'var(--text-body)' },
  },
]);

export const toggle = style([
  controlButton,
  {
    paddingInlineEnd: 'var(--space-3)',
  },
]);

export const toggleIcon = style({
  fontSize: '1.25rem',
  transition: 'transform 150ms ease',
});

export const toggleIconOpen = style({
  transform: 'rotate(180deg)',
});

// Wrapper is the positioning context; the menu overlays content below it.
export const menuWrap = style({
  position: 'relative',
});

export const menu = style({
  position: 'absolute',
  insetInline: 0,
  top: 'var(--space-1)',
  margin: 0,
  padding: 'var(--space-2)',
  listStyle: 'none',
  maxHeight: '18rem',
  overflowY: 'auto',
  background: 'var(--surface-raised)',
  border: '1px solid var(--color-border-value)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-4)',
  zIndex: 50,
  // Hidden until open; getMenuProps must stay mounted for a11y so we collapse.
  display: 'none',
});

export const menuOpen = style({
  display: 'block',
});

export const item = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  userSelect: 'none',
  '@media': {
    '(pointer: coarse)': { minHeight: 'var(--touch-target)' },
  },
});

export const itemHighlighted = style({
  background: 'var(--bg-group-main)',
});

export const itemSelected = style({
  fontWeight: 'var(--weight-medium)',
});

export const status = style({
  padding: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--text-sm)',
});

export const helper = style({
  margin: 0,
  fontSize: 'var(--text-xs)',
  lineHeight: 1.3,
  color: 'var(--text-secondary)',
});
