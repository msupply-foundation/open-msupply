import {
  children,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  Show,
  type JSX,
} from 'solid-js';
import { CloseIcon } from '../../icons';
import { t } from '../../../intl';
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
  /**
   * Visually hide the title (it stays the accessible name) — for dialogs the
   * current app renders without a heading, e.g. the sync modal.
   */
  titleHidden?: boolean;
  /**
   * Renders an icon-only close button pinned to the dialog's top corner (an
   * explicit dismiss affordance for informational dialogs, e.g. the sync
   * modal). Closes via the same onClose path as Escape/scrim. Ignored when
   * `dismissable` is false — a blocking dialog offers no dismiss affordance.
   */
  closeButton?: boolean;
  icon?: JSX.Element;
  description?: JSX.Element;
  children?: JSX.Element;
  /**
   * Bottom-pinned content sitting just above the actions (e.g. a
   * status/estimate banner). When the dialog reserves height
   * (minBodyHeightRem), the slack falls ABOVE this footer, so the footer +
   * actions stay on the dialog's bottom edge instead of floating with the
   * content.
   */
  footer?: JSX.Element;
  /** Footer buttons (rendered inline-end). */
  actions?: JSX.Element;
  /**
   * Content pinned to the inline-START of the actions row — same row as the
   * buttons, opposite end. For a message that belongs beside the actions
   * rather than above them (e.g. a validation hint), so it doesn't eat the
   * body's vertical space. Only shown when `actions` is present.
   */
  actionsLead?: JSX.Element;
  /**
   * Width, in rem — for wider forms (e.g. the stocktake create modal). The
   * dialog sits at this fixed width (clamped down to the viewport on narrow
   * screens), so its box stays a steady size regardless of content — a form
   * switching modes doesn't change width. Overrides the default (30rem) via a
   * custom property; the page passes a number, not CSS, so it owns no
   * stylesheet (principle #10).
   */
  widthRem?: number;
  /**
   * Minimum body height, in rem — reserve space so a dialog whose content
   * changes size (e.g. a form switching modes) doesn't jump. Same
   * custom-property mechanism as widthRem.
   */
  minBodyHeightRem?: number;
  /**
   * Overall size. `'auto'` (default): the dialog sizes to its content (bounded
   * by widthRem + the viewport cap). `'large'`: a workbench modal that fills
   * nearly the whole viewport — full width and ~80% height — for content-heavy
   * modals like the line-edit table. In large mode widthRem is ignored (the
   * dialog goes full-bleed) and the body flexes so a scrolling child (a
   * DataTable) fills the tall space.
   */
  size?: 'auto' | 'large';
  /** `data-testid` for the <dialog> element (locale-stable test hook, e2e/TESTIDS.md). */
  testId?: string;
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
  // Popups (Select / Combobox) opened inside this dialog must MOUNT INTO it —
  // a popup portaled to <body> would be `inert` (unclickable) and painted
  // behind the top-layer dialog. We expose the dialog element via context;
  // nested popups mount here. The dialog box is overflow:visible (the clip
  // lives on the inner .body) so the popup isn't cut off.
  const [dialogEl, setDialogEl] = createSignal<HTMLElement>();
  // JSX-element props are lazy getters: every read builds a fresh element, so
  // a <Show when> test plus an insertion is two creations (a ref/onMount on
  // the passed element would land on the discarded copy). Resolve each one
  // once (kdd/solid-reactivity-pitfalls §3); `children` is read exactly once
  // below, so it needs no helper.
  const icon = children(() => props.icon);
  const description = children(() => props.description);
  const footer = children(() => props.footer);
  const actions = children(() => props.actions);
  const actionsLead = children(() => props.actionsLead);

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
      class={
        props.size === 'large'
          ? `${styles.dialog} ${styles.large}`
          : styles.dialog
      }
      data-testid={props.testId}
      style={{
        // widthRem is ignored in large mode (it goes full-bleed via the .large
        // class).
        ...(props.widthRem && props.size !== 'large'
          ? { '--dialog-width': `${props.widthRem}rem` }
          : {}),
        ...(props.minBodyHeightRem
          ? { '--dialog-min-body-height': `${props.minBodyHeightRem}rem` }
          : {}),
      }}
      aria-labelledby={titleId}
      aria-describedby={description() ? descriptionId : undefined}
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
          <Show when={props.closeButton && props.dismissable !== false}>
            <button
              type="button"
              class={styles.close}
              aria-label={t('common.close')}
              onClick={() => props.onClose()}
            >
              <CloseIcon />
            </button>
          </Show>
          <header
            class={styles.header}
            classList={{ [styles.srOnly ?? '']: props.titleHidden === true }}
          >
            <Show when={icon()}>
              <span class={styles.icon}>{icon()}</span>
            </Show>
            <h2 class={styles.title} id={titleId}>
              {props.title}
            </h2>
          </header>
          <Show when={description()}>
            <p class={styles.description} id={descriptionId}>
              {description()}
            </p>
          </Show>
          {props.children}
          <Show when={footer()}>
            <div class={styles.footer}>{footer()}</div>
          </Show>
          <Show when={actions()}>
            <div
              class={styles.actions}
              data-has-lead={actionsLead() ? '' : undefined}
            >
              {/* Lead content sits at the inline-start; the buttons group at the inline-end. */}
              <Show when={actionsLead()}>
                <div class={styles.actionsLead}>{actionsLead()}</div>
              </Show>
              <div class={styles.actionsButtons}>{actions()}</div>
            </div>
          </Show>
        </div>
      </PortalMountContext.Provider>
    </dialog>
  );
};
