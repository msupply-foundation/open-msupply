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
import { useIsNavOverlay } from '../../utils/createMediaQuery';
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
  /**
   * Vertical alignment of the header row. `center` (default) suits a
   * single-line title + actions. `start` top-aligns them — for a title that's
   * taller than the actions (e.g. a selector with helper text below it), so the
   * actions sit against the title's top edge rather than its centre.
   */
  headerAlign?: 'center' | 'start';
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
  // Popups (Select / Combobox) opened inside this dialog must MOUNT INTO it,
  // not <body> — see ui/utils/portalMount.ts for why (top-layer + inert
  // interaction). We expose the dialog element via PortalMountContext
  // (provided below); nested popups read it and mount there. The dialog box
  // is overflow:visible (the clip lives on the inner .body) so the popup
  // isn't cut off. Every note below about children()/reading props exactly
  // once, and about PortalMountContext.Provider, exists to get a popup-
  // bearing prop (title, description, etc.) constructed as a genuine
  // descendant of that Provider — anywhere else, usePortalMount() resolves
  // to undefined and the popup falls back to the default <body> portal.
  const [dialogEl, setDialogEl] = createSignal<HTMLElement>();
  // Large ("workbench") modals go full-screen on tablet portrait and phones —
  // the same "narrow viewport" line as the nav overlay, so we reuse navOverlay
  // (1024) rather than mint a fourth breakpoint. data-fullscreen drives the
  // CSS; the cutoff lives once in breakpoints.ts (createMediaQuery).
  const fullscreen = useIsNavOverlay();
  // Every JSX-element prop (title, icon, description, footer, actions,
  // actionsLead, headerActions) is resolved via children() — see the note on
  // dialogEl above for why (PortalMountContext). Creating each accessor HERE
  // is inert: children() wraps a lazy createMemo (see solid-js's source), so
  // this doesn't construct anything yet. Construction — and so any component
  // inside (e.g. this modal's item search, in title) mounting under the RIGHT
  // context — only happens the first time the accessor is CALLED. So every
  // call site below lives inside the JSX nested in
  // <PortalMountContext.Provider> further down. Reading the SAME memoized
  // accessor from more than one such call site is fine (title() is read both
  // by the header's own display and by reportTitleIsString below); what's
  // unsafe is a call site OUTSIDE the Provider, or bypassing children()
  // entirely to read props.title raw — which was exactly the bug: title used
  // to be a plain function reading props.title directly, called from 3
  // places, each an independent re-invocation of the whole JSX factory (i.e.
  // a fresh mount). Four reads total meant one dialog open mounted the item
  // search 4 times, each firing its own initial fetch (#549).
  const title = children(() => props.title);
  const icon = children(() => props.icon);
  const headerActions = children(() => props.headerActions);
  const description = children(() => props.description);
  const footer = children(() => props.footer);
  const actions = children(() => props.actions);
  const actionsLead = children(() => props.actionsLead);
  // The <dialog> element's OWN aria-labelledby/aria-label (below) need
  // titleIsString before PortalMountContext.Provider exists in the tree — so,
  // unlike every other derived value here, they can't just call title()
  // directly at that point (that would be the second, wrongly-contexted read
  // this whole note warns about — see title's declaration above). Solved by a
  // signal, SET from an effect created inside <PortalMountContext.Provider>
  // (see reportTitleIsString below, called once from the body div) rather
  // than read again up here.
  const [titleIsString, setTitleIsString] = createSignal(false);
  const reportTitleIsString = (): null => {
    createEffect(() => setTitleIsString(typeof title() === 'string'));
    return null;
  };

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
      data-fullscreen={fullscreen() && props.size === 'large' ? '' : undefined}
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
      // Presence check via `in` — reading the getter here would CREATE the
      // description element outside the Provider (the exact hazard the note
      // on `title` above warns about). A caller passing an explicit
      // `undefined` gets a dangling idref, which assistive tech ignores.
      aria-describedby={'description' in props ? descriptionId : undefined}
      // Escape arrives as `cancel` before the dialog closes — a blocking
      // dialog swallows it here, so the element never closes underneath the
      // parent's `open` state.
      onCancel={event => props.dismissable === false && event.preventDefault()}
      // A modal dialog is an event boundary for Escape: the dialog renders in
      // place (not portaled), so the keydown would bubble on into ancestor
      // key handlers — e.g. Kobalte's accordion root, whose Escape clears the
      // selection and collapses the section AROUND the open dialog. A modal
      // <dialog> detached that way (its host subtree hidden or removed while
      // open) loses its top layer and later re-renders in-flow. Stop
      // propagation only — the UA's own default action (the `cancel` event
      // above) is not propagation-dependent and still closes the dialog.
      onKeyDown={event => event.key === 'Escape' && event.stopPropagation()}
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
          {reportTitleIsString()}
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
          <header
            class={styles.header}
            classList={{ [styles.srOnly ?? '']: props.titleHidden === true }}
            data-align={props.headerAlign === 'start' ? 'start' : undefined}
          >
            <Show when={icon()}>
              <span class={styles.icon}>{icon()}</span>
            </Show>
            {/* A string title is the <h2> (and the aria-labelledby target);
                a component title renders inline in the same heading slot
                (the accessible name then comes from ariaLabel on the
                dialog). titleIsString (used by the <dialog>'s own
                aria-labelledby/aria-label above) is reported from the effect
                near title's declaration — not read again here. */}
            <Show
              when={titleIsString()}
              fallback={<div class={styles.title}>{title()}</div>}
            >
              <h2 class={styles.title} id={titleId}>
                {title()}
              </h2>
            </Show>
            <Show when={headerActions()}>
              <div class={styles.headerActions}>{headerActions()}</div>
            </Show>
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
              {/* Lead content sits at the inline-start; the buttons group at
                  the inline-end. */}
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
