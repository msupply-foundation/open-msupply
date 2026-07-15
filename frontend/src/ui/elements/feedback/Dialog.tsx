import {
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  Show,
  type JSX,
} from 'solid-js';
import { PortalMountContext } from '../../utils/portalMount';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  /**
   * Fired on every close path — Escape, scrim click, or an action button
   * calling it. The parent owns `open`; the dialog never closes itself
   * without reporting here.
   */
  onClose: () => void;
  /**
   * `false` makes the dialog blocking: Escape is swallowed and scrim clicks
   * ignored, so the only ways out are the actions (or the flow resolving
   * `open`). For the modals a user must answer — re-login, store selection,
   * the unexpected-error modal. Default: dismissable.
   */
  dismissable?: boolean;
  /** Required for a11y — becomes the dialog's accessible name. */
  title: string;
  icon?: JSX.Element;
  description?: JSX.Element;
  children?: JSX.Element;
  /**
   * Bottom-pinned content sitting just above the actions (e.g. a status/estimate banner).
   * When the dialog reserves height (minBodyHeightRem), the slack falls ABOVE this footer, so
   * the footer + actions stay on the dialog's bottom edge instead of floating with the content.
   */
  footer?: JSX.Element;
  /** Footer buttons (rendered inline-end). */
  actions?: JSX.Element;
  /**
   * Width, in rem — for wider forms (e.g. the stocktake create modal). The dialog sits at this
   * fixed width (clamped down to the viewport on narrow screens), so its box stays a steady size
   * regardless of content — a form switching modes doesn't change width. Overrides the default
   * (30rem) via a custom property; the page passes a number, not CSS, so it owns no stylesheet
   * (principle #10).
   */
  widthRem?: number;
  /**
   * Minimum body height, in rem — reserve space so a dialog whose content changes size (e.g.
   * a form switching modes) doesn't jump. Same custom-property mechanism as widthRem.
   */
  minBodyHeightRem?: number;
}

/*
 * Modal dialog — native <dialog> + showModal(), NO library (unlike the RnD
 * prototype, which bought Radix Dialog — see kdd/own-simple-buy-hard). The
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
  let dialog!: HTMLDialogElement;
  const titleId = createUniqueId();
  const descriptionId = createUniqueId();
  // Popups (Select / Combobox) opened inside this dialog must MOUNT INTO it — a popup
  // portaled to <body> would be `inert` (unclickable) and painted behind the top-layer
  // dialog. We expose the dialog element via context; nested popups mount here. The dialog
  // box is overflow:visible (the clip lives on the inner .body) so the popup isn't cut off.
  const [dialogEl, setDialogEl] = createSignal<HTMLElement>();

  createEffect(() => {
    if (props.open && !dialog.open) dialog.showModal();
    else if (!props.open && dialog.open) dialog.close();
  });

  // Solid removes the node on unmount, but close() while still connected also
  // releases the top layer + restores focus deterministically.
  onCleanup(() => dialog.open && dialog.close());

  return (
    <dialog
      ref={el => {
        dialog = el;
        setDialogEl(el);
      }}
      class={styles.dialog}
      style={{
        ...(props.widthRem ? { '--dialog-width': `${props.widthRem}rem` } : {}),
        ...(props.minBodyHeightRem
          ? { '--dialog-min-body-height': `${props.minBodyHeightRem}rem` }
          : {}),
      }}
      aria-labelledby={titleId}
      aria-describedby={props.description ? descriptionId : undefined}
      // Escape arrives as `cancel` before the dialog closes — a blocking
      // dialog swallows it here, so the element never closes underneath the
      // parent's `open` state.
      onCancel={event => props.dismissable === false && event.preventDefault()}
      // Native close paths (Escape now; browser `closedby` UI later) land
      // here — report them so the parent's `open` stays the source of truth.
      onClose={() => props.open && props.onClose()}
      // A pointerdown whose target is the <dialog> itself hit the ::backdrop:
      // the inner .body covers the dialog box completely (the dialog has zero
      // padding for exactly this reason), so content clicks can't match.
      onPointerDown={event =>
        event.target === dialog &&
        props.dismissable !== false &&
        props.onClose()
      }
    >
      <PortalMountContext.Provider value={dialogEl}>
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
          <Show when={props.footer}>
            <div class={styles.footer}>{props.footer}</div>
          </Show>
          <Show when={props.actions}>
            <div class={styles.actions}>{props.actions}</div>
          </Show>
        </div>
      </PortalMountContext.Provider>
    </dialog>
  );
};
