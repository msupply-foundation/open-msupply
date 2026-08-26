import { Show } from 'solid-js';
import { t } from '../../../intl';
import styles from './ErrorDetails.module.css';

export interface ErrorDetailsProps {
  /** Raw error text / JSON — rendered verbatim in a scrolling `<pre>`. */
  detail: string;
  /** Optional guidance line shown above the raw detail. */
  hint?: string;
  /**
   * The disclosure trigger label. Defaults to the localised "More
   * information"; pass a more specific label (e.g. "Click to view details")
   * where it reads better.
   */
  summaryLabel?: string;
}

/*
 * ErrorDetails — the raw error / JSON a caller tucks behind a native
 * `<details>` disclosure, so an error message stays terse and the full
 * technical detail is one click away. Drop it as the last child of an
 * `<Alert severity="error">`, beside the human-readable message. Own-the-
 * simple: a native `<details>` + `<pre>`, pure CSS + tokens, no library
 * (kdd/own-simple-buy-hard).
 */
export const ErrorDetails = (props: ErrorDetailsProps) => (
  <details class={styles.details}>
    <summary>{props.summaryLabel ?? t('error.more-info')}</summary>
    <Show when={props.hint}>{hint => <p class={styles.hint}>{hint()}</p>}</Show>
    <pre class={styles.detail}>{props.detail}</pre>
  </details>
);
