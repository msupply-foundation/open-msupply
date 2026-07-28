import type { JSX } from 'solid-js';
import { Toolbar } from './Toolbar';
import { FormRow } from '../Form/FormRow';
import styles from './HeaderToolbar.module.css';

export interface HeaderToolbarProps {
  /**
   * The header's field cluster — inputs and read-only LabelledValues. Each is
   * an equal share of the row (a FormRow) at `minFieldWidth`, growing to fill
   * and wrapping intrinsically as a unit.
   */
  children?: JSX.Element;
  /**
   * An optional compact <Alert> — the persistent-context meta chip. Rendered at
   * the end of the field row as a content-hugging chip (Alert's own
   * `flex: 0 1 auto`) pinned to the bottom baseline, so it rides the row when
   * there's room and drops to its own line when there isn't. Pass an
   * `<Alert compact>` element (its `compact` sets the `data-compact` hook this
   * relies on).
   */
  alert?: JSX.Element;
  /**
   * Min width each field keeps before the row wraps (FormRow's `minItemWidth`).
   * Default `10rem`.
   */
  minFieldWidth?: string;
}

/*
 * HeaderToolbar — the page-header field cluster (Carl 2026-07-27). A thin
 * specialisation of <Toolbar> that ENFORCES the header field-row layout so
 * pages don't hand-roll it: children flow into a FormRow (equal shares at a min
 * width, growing to fill), wrapped in a grow container so the row fills the
 * toolbar and packs as-many-fields-per-row-as-fit; an optional compact Alert
 * hugs its content and bottom-aligns. The generic <Toolbar> stays layout-only
 * for its other uses (a list FilterBar, a stub); this composes it for the
 * detail/header field case. Demoed on the Header showcase (the Detail-table
 * page uses it too).
 */
export const HeaderToolbar = (props: HeaderToolbarProps) => (
  <Toolbar>
    <div class={styles.fields}>
      <FormRow minItemWidth={props.minFieldWidth ?? '10rem'}>
        {props.children}
        {props.alert}
      </FormRow>
    </div>
  </Toolbar>
);
