import type { JSX } from 'solid-js';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  message: string;
  /** Optional call to action below the message (e.g. a "New …" Button). */
  children?: JSX.Element;
}

/*
 * Empty state — centred quiet text for "nothing here": an unbuilt page, an
 * empty or filtered-to-nothing table, an empty tab. The current app's
 * NothingHere. Fills whatever container it's given (a Page body, a tab
 * panel), so the message sits centred in the available space.
 */
export const EmptyState = (props: EmptyStateProps) => (
  <div class={styles.empty}>
    <p class={styles.message}>{props.message}</p>
    {props.children}
  </div>
);
