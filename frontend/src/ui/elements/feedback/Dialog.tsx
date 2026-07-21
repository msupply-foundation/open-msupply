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
import { useIsCompact } from '../../utils/createMediaQuery';
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
  /**
   * The dialog heading. A string is rendered as the <h2> AND used as the
   * accessible name (aria-labelledby). A JSX element (e.g. an inline selector)
   * is rendered in the heading slot instead — then pass `ariaLabel` for the
   * accessible name, since a component isn't a usable label.
   */
  title: string | JSX.Element;
  /**
   * The dialog's accessible name when `title` is a component (a component can't
   * serve as aria-labelledby text). Required for a11y in that case; ignored
   * when `title` is a string (the string is the label). Also drives
   * aria-labelledby vs aria-label selection.
   */
  ariaLabel?: string;
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
  /**
   * Action(s) pinned to the inline-END of the header row, on the same line as
   * the title (e.g. an "Add" affordance that belongs with the heading rather
   * than the footer). The title takes the free space; these group at the end.
   */
  headerActions?: JSX.Element;
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
  /** `data-testid` for the <dialog> element (locale-stable test hook,
   * e2e/TESTIDS.md). */
  testId?: string;
}

interface DialogHeaderProps {
  title: string | JSX.Element;
  titleIsString: boolean;
  titleId: string;
  titleHidden?: boolean;
  icon?: JSX.Element;
  headerActions?: JSX.Element;
}

// The header, as its own component so its JSX-element props (icon, title,
// headerActions) are resolved UNDER PortalMountContext — a combobox in the
// title/actions then mounts its popup into the dialog (top layer), not <body>
// (where the top-layer dialog would hide it). Each element prop is read once
// via children() (§3): a guard-plus-insert would otherwise create it twice.
const DialogHeader = (props: DialogHeaderProps): JSX.Element => {
  const icon = children(() => props.icon);
  const title = children(() => props.title);
  const headerActions = children(() => props.headerActions);
  return (
    <header
      class={styles.header}
      classList={{ [styles.srOnly ?? '']: props.titleHidden === true }}
    >
      <Show when={icon()}>
        <span class={styles.icon}>{icon()}</span>
      </Show>
      {/* A string title is the <h2> (and the aria-labelledby target); a
          component title renders inline in the same heading slot (the
          accessible name then comes from ariaLabel on the dialog). */}
      <Show
        when={props.titleIsString}
        fallback={<div class={styles.title}>{title()}</div>}
      >
        <h2 class={styles.title} id={props.titleId}>
          {title()}
        </h2>
      </Show>
      <Show when={headerActions()}>
        <div class={styles.headerActions}>{headerActions()}</div>
      </Show>
    </header>
  );
};

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
  // Large ("workbench") modals go full-screen on phone-ish widths;
  // data-fullscreen drives the CSS. The 600px cutoff lives once in
  // breakpoints.ts (createMediaQuery).
  const compact = useIsCompact();
  // JSX-element props are lazy getters: every read builds a fresh element, so
  // a <Show when> test plus an insertion is two creations (a ref/onMount on
  // the passed element would land on the discarded copy). Resolve each one
  // once (kdd/solid-reactivity-pitfalls §3); `children` is read exactly once
  // below, so it needs no helper.
  const description = children(() => props.description);
  const footer = children(() => props.footer);
  const actions = children(() => props.actions);
  const actionsLead = children(() => props.actionsLead);
  // A string title doubles as the accessible name (aria-labelledby → the <h2>).
  // A component title can't be an accessible name, so callers pass `ariaLabel`
  // and we use aria-label instead.
  const titleIsString = () => typeof props.title === 'string';
  // NB: `icon`, `headerActions` and `title` are resolved INSIDE the header
  // (DialogHeader), not hoisted here — a component in `title`/`headerActions`
  // (e.g. an inline combobox) must be created UNDER PortalMountContext so its
  // popup mounts into this dialog (top layer, non-inert), not portaled to
  // <body> where the top-layer dialog would hide it. Resolving them here (above
  // the Provider) would create them outside that context.

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
      data-fullscreen={compact() && props.size === 'large' ? '' : undefined}
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
      // A string title labels via aria-labelledby (the <h2 id={titleId}>); a
      // component title has no label text, so fall back to the caller's
      // ariaLabel.
      aria-labelledby={titleIsString() ? titleId : undefined}
      aria-label={titleIsString() ? undefined : props.ariaLabel}
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
        {/* Initial focus lands HERE, not on the first field (ui-standards ›
            accessibility › keyboard): showModal() focuses the first
            autofocus-bearing element, and without this the first field takes
            it — which pops an autocomplete's listbox open unprompted
            (Combobox opens on focus by design). tabindex=-1 makes the panel
            programmatically focusable; the first Tab reaches the first
            control. */}
        <div class={styles.body} tabindex="-1" autofocus>
          <Show when={props.closeButton && props.dismissable !== false}>
            <button
              type="button"
              class={styles.close}
              aria-label={t('button.close')}
              onClick={() => props.onClose()}
            >
              <CloseIcon />
            </button>
          </Show>
          <DialogHeader
            title={props.title}
            titleIsString={titleIsString()}
            titleId={titleId}
            titleHidden={props.titleHidden}
            icon={props.icon}
            headerActions={props.headerActions}
          />
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
