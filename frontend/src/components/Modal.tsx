import { Show, onCleanup, onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import styles from '../styles/shared.module.css';

// A composable modal shell (kdd/explicit-composition — shared UI in small
// components that own their full markup). It owns *layout* only: the backdrop, the
// centred panel, and a header / body / footer stack. It owns no content decisions —
// the consumer supplies the body (children) and the footer buttons, decides whether
// it is open, and decides what closing does.
//
// The only behaviour it owns is the two conventional ways to *ask* to close —
// pressing Escape and clicking the backdrop — both of which call `onClose`. The
// consumer is free to ignore them (e.g. mid-save) by not acting on onClose. Backdrop
// closing can be turned off entirely with `disableBackdropClose` (e.g. a form the
// user shouldn't lose by a stray click), matching the reference's disableBackdrop.
//
//   <Modal open={open()} title="New stocktake" onClose={close}
//     footer={<><button onClick={close}>Cancel</button><button onClick={save}>OK</button></>}>
//     <MyForm … />
//   </Modal>
export const Modal = (props: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Buttons (and anything else) for the footer, right-aligned. */
  footer?: JSX.Element;
  /** Panel width in px. Body scrolls if content exceeds the viewport. */
  width?: number;
  /** When set, clicking the backdrop does not request close (Escape still does). */
  disableBackdropClose?: boolean;
  children: JSX.Element;
}): JSX.Element => {
  // Escape requests close whenever the modal is open. Registered once; the handler
  // reads props.open live, so it is a no-op while closed and needs no re-binding.
  const onKeyDown = (event: KeyboardEvent) => {
    if (props.open && event.key === 'Escape') props.onClose();
  };
  onMount(() => document.addEventListener('keydown', onKeyDown));
  onCleanup(() => document.removeEventListener('keydown', onKeyDown));

  return (
    <Show when={props.open}>
      <div
        class={styles.overlay}
        onClick={event => {
          // Only a click on the backdrop itself (not bubbling up from the panel)
          // requests close, and only when the consumer allows it.
          if (!props.disableBackdropClose && event.target === event.currentTarget) {
            props.onClose();
          }
        }}
      >
        <div class={styles.modalPanel} style={{ width: `${props.width ?? 380}px` }} role="dialog">
          <div class={styles.modalHeader}>
            <h2 class={styles.modalTitle}>{props.title}</h2>
          </div>
          <div class={styles.modalBody}>{props.children}</div>
          <Show when={props.footer}>
            <div class={styles.modalFooter}>{props.footer}</div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
