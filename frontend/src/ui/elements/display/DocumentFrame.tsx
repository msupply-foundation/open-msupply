import { createSignal, on, createEffect, Show } from 'solid-js';
import { Spinner } from '../feedback/Spinner';
import styles from './DocumentFrame.module.css';

export interface DocumentFrameProps {
  /**
   * Required — the iframe's accessible name (what the embedded document is).
   */
  title: string;
  /** URL of the document to load. Provide this OR `srcdoc`. */
  src?: string;
  /** Inline HTML to render. Provide this OR `src`. */
  srcdoc?: string;
  /**
   * Sandbox token string. Default 'allow-same-origin' — the document may load
   * same-origin assets (e.g. images) but runs no scripts. Choose deliberately:
   * a document that must run its own scripts wants `allow-scripts` INSTEAD of
   * (not alongside) `allow-same-origin`, so the two capabilities never combine
   * into a frame that can reach back into the app.
   */
  sandbox?: string;
  class?: string;
  testId?: string;
}

/*
 * DocumentFrame — a sandboxed <iframe> wrapper for server-rendered HTML
 * documents (report output). Fills its container; shows a centred Spinner
 * overlay until the iframe's load event fires. Sandboxed to
 * `allow-same-origin` by default: the document may pull same-origin assets but
 * executes no scripts (no allow-scripts), so a rendered report can't run code
 * in the app's context. The loading flag resets whenever the source changes so
 * a re-navigated frame shows the spinner again.
 *
 * `allow-scripts` and `allow-same-origin` are alternatives here, never a pair:
 * a frame granted both can reach the parent document — including to strip its
 * own sandbox attribute — which is no sandbox at all. Whichever a caller picks,
 * the frame still cannot navigate the top window, submit forms, open popups, or
 * open modals.
 */
export const DocumentFrame = (props: DocumentFrameProps) => {
  const [loaded, setLoaded] = createSignal(false);

  // Reset to the loading state when the source changes (defer: the initial
  // state is already `false`, and onLoad will flip it true).
  createEffect(
    on(
      () => [props.src, props.srcdoc],
      () => setLoaded(false),
      { defer: true }
    )
  );

  return (
    <div class={props.class ? `${styles.frame} ${props.class}` : styles.frame}>
      <iframe
        class={styles.iframe}
        title={props.title}
        src={props.src}
        srcdoc={props.srcdoc}
        sandbox={props.sandbox ?? 'allow-same-origin'}
        data-testid={props.testId}
        onLoad={() => setLoaded(true)}
      />
      <Show when={!loaded()}>
        <div class={styles.loading}>
          <Spinner center label={props.title} />
        </div>
      </Show>
    </div>
  );
};
