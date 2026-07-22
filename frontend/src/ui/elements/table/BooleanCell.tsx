import { Match, Show, Switch } from 'solid-js';
import type { ColumnMeta } from '@tanstack/solid-table';
import type { CellFragment } from './tableHelpers';
import { t } from '../../../intl';
import { CheckIcon } from '../../icons';
import styles from './BooleanCell.module.css';

/*
 * BooleanCell — the one boolean table-cell renderer (registry role "boolean
 * cell (flag in a table)"). Pure CSS + one icon — own the simple.
 *
 * One component, three displays, chosen per column:
 *  - 'dot'   (default) — a filled dot when SET, blank otherwise. The glyph the
 *            reference open-mSupply app uses for a boolean column, and the
 *            registry default.
 *  - 'check' — a tick when SET, blank otherwise, for columns where "ticked"
 *            reads better than a dot (e.g. an "approved" flag).
 *  - 'yesNo' — localised "Yes"/"No" text for BOTH states (e.g. a stocktake's
 *            "Locked" column), where the false state is worth stating too.
 *
 * Accessibility (spec/ui-standards/accessibility.md § assistive-tech parity;
 * DIVERGENCES D8): the dot/check marker is never an aria-hidden glyph alone —
 * the SET state carries an accessible NAME (role="img" + aria-label), so a
 * screen reader announces e.g. "On hold" instead of nothing. The unset state
 * is a genuinely empty cell (blank-when-off). 'yesNo' needs no aria — its text
 * names itself. This accessible name is the deliberate improvement over the
 * reference app, whose dot/check cells are silent (D8).
 */
export type BooleanCellDisplay = 'dot' | 'check' | 'yesNo';

export const BooleanCell = (props: {
  value: boolean;
  /** How to render the flag. Default 'dot'. */
  display?: BooleanCellDisplay;
  /**
   * Accessible name for the SET (true) state, e.g. "On hold" — supply it for
   * the 'dot'/'check' marker variants so the marker is not silent (D8). Ignored
   * by 'yesNo', whose text names itself; falls back to a generic "Yes" so a
   * marker is never left without a name.
   */
  label?: string;
}) => {
  const display = () => props.display ?? 'dot';
  return (
    <Switch>
      <Match when={display() === 'yesNo'}>
        {props.value ? t('messages.yes') : t('messages.no')}
      </Match>
      {/* dot / check: a marker only when SET, a blank cell otherwise; the
          marker carries an accessible name for the state (never silent). */}
      <Match when={props.value}>
        <span
          class={display() === 'check' ? styles.check : styles.dot}
          role="img"
          aria-label={props.label ?? t('messages.yes')}
        >
          <Show when={display() === 'check'}>
            <CheckIcon />
          </Show>
        </span>
      </Match>
    </Switch>
  );
};

// Cell fragment in the tableHelpers idiom — spread into a Column whose accessor
// resolves to a boolean (`cell` reads it via info.getValue()). The marker
// variants ('dot'/'check') require a `label` (the SET state's accessible name);
// 'yesNo' takes none. Marker columns default to centre alignment (matching the
// reference app's boolean columns); 'yesNo' keeps the default text alignment.
// The optional `meta` is spread last so a caller can re-align or extend.
type GetBooleanCellArgs =
  { display?: 'dot' | 'check'; label: string } | { display: 'yesNo' };

export const getBooleanCell = <T,>(
  args: GetBooleanCellArgs,
  meta?: ColumnMeta<never, unknown>
): CellFragment<T> => {
  const display = args.display ?? 'dot';
  const label = 'label' in args ? args.label : undefined;
  return {
    meta: {
      ...(display === 'yesNo' ? {} : { align: 'center' as const }),
      ...meta,
    },
    cell: info => (
      <BooleanCell
        value={info.getValue<boolean>() ?? false}
        display={display}
        label={label}
      />
    ),
  };
};
