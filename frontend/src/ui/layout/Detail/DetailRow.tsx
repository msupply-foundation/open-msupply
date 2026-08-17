import { children, Match, Switch, type JSX } from 'solid-js';
import { TextField } from '../../elements/inputs/TextField';
import styles from './DetailRow.module.css';

// Appends a ":" to the label unless it already ends in ":" or "?" (mirrors the
// current app's labelWithPunctuation).
const withColon = (label: string): string =>
  label === '' || /[?:]$/.test(label) ? label : `${label}:`;

const displayValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);

export interface DetailRowProps {
  /** Field label — shown inline-start, bold, right-aligned, colon-suffixed. */
  label: string;
  /** Read-only text value — rendered in a disabled field control. */
  value?: string | number | null;
  /** Boolean flag — rendered as a disabled checkbox in the value slot. */
  checked?: boolean;
  /** Custom value control (e.g. a link) — overrides value/checked. */
  control?: JSX.Element;
  /** Value alignment within its column (default end; start for flags/links). */
  align?: 'start' | 'end';
  /**
   * Which column-pair of a `DetailGrid` this row occupies. Omit inside a
   * single-column `DetailSection` (rows auto-place).
   */
  side?: 'left' | 'right';
  /**
   * Full-width row: the value spans from the first value column to the end of
   * the grid (address/country/website/supply level), so it lines up with — and
   * is wider than — the two-column fields above.
   */
  full?: boolean;
}

/*
 * DetailRow — one read-only field row of the detail form
 * (spec/ui-standards/detail-views): a bold, right-aligned, colon-suffixed label
 * on the inline-start and the value on the inline-end (~40/60 split). A plain
 * text value renders in a disabled TextField (the read-only field look, reused
 * so the styling stays tokenised); a boolean renders as a disabled checkbox; a
 * `control` slot covers links/other. Nothing here is editable (AC read-only).
 */
export const DetailRow = (props: DetailRowProps): JSX.Element => {
  // Resolve the JSX-element `control` prop ONCE (a lazy getter builds a fresh
  // element on every read; it's read in the <Match when> test and again as the
  // child) — kdd/solid-reactivity-pitfalls §3.
  const control = children(() => props.control);
  return (
    <div class={styles.row}>
      <span
        class={styles.label}
        data-side={props.side}
        data-full={props.full ? '' : undefined}
      >
        {withColon(props.label)}
      </span>
      <div
        class={styles.value}
        data-align={props.align ?? 'end'}
        data-kind={props.checked !== undefined ? 'checkbox' : 'field'}
        data-side={props.side}
        data-full={props.full ? '' : undefined}
      >
        <Switch
          fallback={
            <TextField
              label={props.label}
              hideLabel
              disabled
              readOnly
              value={displayValue(props.value)}
            />
          }
        >
          <Match when={control()}>{control()}</Match>
          <Match when={props.checked !== undefined}>
            <input
              type="checkbox"
              class={styles.checkbox}
              checked={props.checked}
              disabled
              aria-label={props.label}
            />
          </Match>
        </Switch>
      </div>
    </div>
  );
};
