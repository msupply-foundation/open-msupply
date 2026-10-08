import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { NothingHereIcon } from '../../icons';
import { t } from '../../../intl';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** The body line under the heading (e.g. "No items have been added…"). */
  message: string;
  /**
   * The bold heading above the message. Defaults to "Nothing here" — the
   * current app's empty-state title. Pass a different string to override.
   */
  title?: string;
  /**
   * Show the sprout illustration + heading. Default true. Pass false for a
   * plain centred message (e.g. a loading fallback that reuses the same
   * centred layout without the illustration + heading).
   */
  graphic?: boolean;
  /**
   * Replace the default NothingHereIcon with a bespoke illustration (the 404
   * page's UnhappyMan). The element owns its own sizing; the heading and
   * message render beneath it as usual.
   */
  illustration?: JSX.Element;
  /**
   * Optional call to action, rendered INLINE after the message (e.g. a "Create
   * a new one" ghost button) — same line, matching the current app.
   */
  children?: JSX.Element;
  /** Test id on the root, for e2e (e.g. the table/list "nothing-here" hook). */
  'data-testid'?: string;
}

/*
 * Empty state — the current app's NothingHere: a centred illustration, a
 * bold "Nothing here" heading, a quiet body line, and an optional call to
 * action (e.g. a "Create a new one" button) sitting INLINE after the message
 * on the same line. Used for an empty or filtered-to-nothing table (via
 * DataTable's `empty`), an unbuilt page, or an empty tab. Fills whatever
 * container it's given, so it sits centred in the available space.
 *
 * `graphic={false}` drops the illustration + heading for a plain centred
 * message — the loading fallback reuses this layout that way.
 */
export const EmptyState = (props: EmptyStateProps) => (
  <div class={styles.empty} data-testid={props['data-testid']}>
    <Show when={props.graphic !== false}>
      {props.illustration ?? <NothingHereIcon class={styles.graphic} />}
      <p class={styles.title}>{props.title ?? t('error.no-results')}</p>
    </Show>
    <div class={styles.body}>
      <span class={styles.message}>{props.message}</span>
      {props.children}
    </div>
  </div>
);
