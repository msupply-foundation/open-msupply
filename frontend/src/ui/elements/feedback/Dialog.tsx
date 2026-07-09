import {
  createEffect,
  createUniqueId,
  onCleanup,
  Show,
  type JSX,
} from 'solid-js'
import styles from './Dialog.module.css'

export interface DialogProps {
  open: boolean
  /**
   * Fired on every close path — Escape, scrim click, or an action button
   * calling it. The parent owns `open`; the dialog never closes itself
   * without reporting here.
   */
  onClose: () => void
  /**
   * `false` makes the dialog blocking: Escape is swallowed and scrim clicks
   * ignored, so the only ways out are the actions (or the flow resolving
   * `open`). For the modals a user must answer — re-login, store selection,
   * the unexpected-error modal. Default: dismissable.
   */
  dismissable?: boolean
  /** Required for a11y — becomes the dialog's accessible name. */
  title: string
  icon?: JSX.Element
  description?: JSX.Element
  children?: JSX.Element
  /** Footer buttons (rendered inline-end). */
  actions?: JSX.Element
}

/*
 * Modal dialog — native <dialog> + showModal(), NO library (unlike the RnD
 * prototype, which bought Radix Dialog — see DECISIONS.md 2026-07-09). The
 * platform now covers the whole contract Radix was bought for: top layer +
 * inert background (a real focus trap), focus restore to the trigger on
 * close, Escape (`cancel` event), role=dialog + aria-modal, and ::backdrop.
 * The prototype's other objection — "imperative to drive from React" — doesn't
 * apply in Solid: one createEffect maps the `open` prop onto
 * showModal()/close(). We hand-roll the two small gaps: scrim-click dismiss
 * (the native `closedby="any"` is still limited-availability) and a one-line
 * scroll lock in the CSS.
 *
 * Usage pattern: keep `open` state in the component that owns the action,
 * render this declaratively next to it. For confirmations use <ConfirmDialog>.
 */
export const Dialog = (props: DialogProps) => {
  let dialog!: HTMLDialogElement
  const titleId = createUniqueId()
  const descriptionId = createUniqueId()

  createEffect(() => {
    if (props.open && !dialog.open) dialog.showModal()
    else if (!props.open && dialog.open) dialog.close()
  })

  // Solid removes the node on unmount, but close() while still connected also
  // releases the top layer + restores focus deterministically.
  onCleanup(() => dialog.open && dialog.close())

  return (
    <dialog
      ref={dialog}
      class={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={props.description ? descriptionId : undefined}
      // Escape arrives as `cancel` before the dialog closes — a blocking
      // dialog swallows it here, so the element never closes underneath the
      // parent's `open` state.
      onCancel={(event) => props.dismissable === false && event.preventDefault()}
      // Native close paths (Escape now; browser `closedby` UI later) land
      // here — report them so the parent's `open` stays the source of truth.
      onClose={() => props.open && props.onClose()}
      // A pointerdown whose target is the <dialog> itself hit the ::backdrop:
      // the inner .body covers the dialog box completely (the dialog has zero
      // padding for exactly this reason), so content clicks can't match.
      onPointerDown={(event) =>
        event.target === dialog && props.dismissable !== false && props.onClose()
      }
    >
      <div class={styles.body}>
        <header class={styles.header}>
          <Show when={props.icon}>
            <span class={styles.icon}>{props.icon}</span>
          </Show>
          <h2 class={styles.title} id={titleId}>
            {props.title}
          </h2>
        </header>
        <Show when={props.description}>
          <p class={styles.description} id={descriptionId}>
            {props.description}
          </p>
        </Show>
        {props.children}
        <Show when={props.actions}>
          <div class={styles.actions}>{props.actions}</div>
        </Show>
      </div>
    </dialog>
  )
}
