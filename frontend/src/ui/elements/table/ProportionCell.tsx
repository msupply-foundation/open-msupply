import { Show } from 'solid-js';
import type { ColumnMeta } from '@tanstack/solid-table';
import { formatNumber, round, t } from '../../../intl';
import { proportionFill, type ProportionTone } from './proportionFill';
import type { CellFragment } from './tableHelpers';
import styles from './ProportionCell.module.css';

/*
 * ProportionCell — a value presented as a proportion of a capacity inside a
 * table cell (registry role "proportion cell (fullness bar)"): a horizontal
 * fill sized to used ÷ capacity, read-only, plus the proportion as text. Its
 * consumer is the locations list's Volume used column (spec/locations
 * ui-surface S1 column 5). Hand-rolled — a track and a fill (own the simple);
 * the maths is proportionFill.ts.
 *
 * Not a native `<progress>` and not `role="progressbar"`: this is a static
 * reading of a stored figure, not a task advancing, and neither can express a
 * value PAST its maximum (both clamp) — which is a real state here, a location
 * holding more volume than its capacity. The bar is therefore decorative
 * (aria-hidden) and the figure beside it carries the whole reading, with the
 * near-/over-capacity tone stated in visually-hidden text as well: nothing
 * rests on the fill or its colour alone (spec/ui-standards/accessibility §
 * assistive-tech parity). This is deliberately more than the current app, whose
 * bar signals >80% / >100% by colour only.
 */

// The tone as text — the accessible equivalent of the amber / striped-red fill.
// A normal reading needs none: the figure already says it.
const toneText = (tone: ProportionTone): string | undefined =>
  tone === 'over'
    ? t('label.over-capacity')
    : tone === 'near'
      ? t('label.near-capacity')
      : undefined;

// The visible figure is whole percents — a cell-width figure read at a glance;
// the hover text carries the precise one (and the tone, for a pointer user who
// can't distinguish the colours).
const figure = (percentage: number): string =>
  `${formatNumber(percentage, { maximumFractionDigits: 0 })}%`;

const hoverText = (percentage: number, tone: ProportionTone): string => {
  const exact = `${round(percentage, 2)}%`;
  const state = toneText(tone);
  return state ? `${exact} — ${state}` : exact;
};

export const ProportionCell = (props: {
  /**
   * The proportion as a PERCENTAGE of the capacity (used ÷ capacity × 100),
   * unclamped — over 100 is a real state. Absent (`undefined` / `null`) or
   * non-finite — which is what dividing by a capacity of `0` produces — renders
   * a BLANK cell: there is no proportion to show, and a 0% bar would read as a
   * genuine "empty" measurement. A real `0` IS such a measurement and renders
   * an empty bar (see proportionFill).
   */
  percentage: number | null | undefined;
}) => (
  <Show when={proportionFill(props.percentage)}>
    {fill => (
      <div
        class={styles.cell}
        title={hoverText(fill().percentage, fill().tone)}
      >
        <div class={styles.track} aria-hidden="true">
          <div
            class={styles.fill}
            data-tone={fill().tone}
            style={{ 'inline-size': `${fill().width}%` }}
          />
        </div>
        <span class={styles.value} data-tone={fill().tone}>
          {figure(fill().percentage)}
        </span>
        <Show when={toneText(fill().tone)}>
          {state => <span class={styles.srOnly}>{state()}</span>}
        </Show>
      </div>
    )}
  </Show>
);

// Cell fragment in the tableHelpers idiom — spread into a Column whose value
// resolves to the proportion as a percentage (`cell` reads it via
// info.getValue()). Argument-free, so it is also reachable through
// getCellDefinition (the `volumeUsed` key); the width preset lives there.
//
// The percentage — not used + capacity — is the column's value because whether
// a proportion is meaningful at all is a DOMAIN rule, not a display one: the
// locations vertical suppresses the figure for a location whose stock lines
// carry no volume as well as for one with no capacity, through the same shared
// helper its volume-aware location lookup reads (domain/location/volume). One
// rule, one place; the cell renders whatever proportion it is handed, or
// nothing.
export const getProportionCell = <T,>(
  meta?: ColumnMeta<never, unknown>
): CellFragment<T> => ({
  meta: { ...meta },
  cell: info => (
    <ProportionCell percentage={info.getValue<number | null | undefined>()} />
  ),
});
