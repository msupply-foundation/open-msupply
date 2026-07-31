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
import type { FocusTarget } from '../../utils/createFocusTarget';
import { createAction } from '../../utils/keyActions';
import { ALT_S, ESCAPE } from '../../utils/shortcuts';
import { InTableCellContext } from '../table/inTableCell';
import { SurfaceActiveContext } from '../../utils/surfaceActive';
import {
  DialogConfirmContext,
  type ConfirmClaim,
  type ConfirmRole,
  type DialogConfirmSlots,
} from './dialogConfirm';
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
  /**
   * Footer buttons. Rendered (with `footer`) in a region pinned below the
   * dialog's scroll area: over-tall content scrolls between the header and the
   * buttons, which hold still on the dialog's bottom edge.
   */
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
  /**
   * Drops the dialog's panel surface — no background, no shadow, no padding —
   * so the content floats directly over the scrim. For an overlay whose own
   * children already carry surfaces (the command palette: a text field and an
   * option list, nothing behind them). Everything else <Dialog> gives stays:
   * top layer, inert page, Escape, focus restore, scrim-click dismiss.
   */
  chromeless?: boolean;
  /**
   * Where focus lands when the dialog opens, overriding the default (the
   * dialog panel — see the note on `.body` below). Pass a
   * `createFocusTarget()` handle that a control inside the dialog is bound to.
   *
   * Reserve it for a dialog that exists to capture ONE thing and opens with
   * that control ready — a create dialog whose only starting control is its
   * picker, a line editor opening on its item search (ui-standards ›
   * accessibility › keyboard). A dialog with a form to read, or several
   * fields, keeps the panel default: the first Tab reaches the first control
   * and no autocomplete pops its listbox open unprompted.
   */
  initialFocus?: FocusTarget;
  /**
   * `false` opts this dialog out of Enter-to-confirm (spec/keyboard KB-E2: "A
   * dialog MAY opt out of Enter-to-confirm entirely"). Default: Enter confirms
   * from any of its text fields, activating the continuing action (Save & next)
   * when present and enabled, otherwise the plain one.
   */
  enterConfirms?: boolean;
  /** `data-testid` for the <dialog> element (locale-stable test hook,
   * e2e/TESTIDS.md). */
  testId?: string;
}

/*
 * Input types that ACTIVATE THEMSELVES on Enter, as the keydown's default
 * action. Confirming the dialog for these too would run two actions from one
 * keypress — the double-fire KB-E4 forbids ("a button already activates on
 * Enter; nothing may re-fire it on top of that").
 */
const SELF_ACTIVATING_INPUT_TYPES = new Set([
  'submit',
  'button',
  'reset',
  'image',
]);

interface DialogContentProps {
  /**
   * The Dialog's props. Read HERE (inside PortalMountContext.Provider) so every
   * popup-bearing slot is constructed under the Provider — see the note in
   * Dialog for why construction, not read location, carries the context.
   */
  content: DialogProps;
  titleId: string;
  descriptionId: string;
  setTitleIsString: (isString: boolean) => void;
}

// The dialog's inner content — rendered as a child of
// <PortalMountContext.Provider>, so every JSX-element slot resolved here
// (title, icon, description, footer, actions, …) is CONSTRUCTED under that
// Provider. A Combobox/Select in any of those slots then mounts its popup into
// the dialog (top layer, non-inert), not <body>. Each slot is resolved via
// children() exactly once, so a slot bearing a fetch fires it once per open,
// not once per read site (#549).
const DialogContent = (local: DialogContentProps): JSX.Element => {
  const c = local.content;
  const title = children(() => c.title);
  const icon = children(() => c.icon);
  const headerActions = children(() => c.headerActions);
  const description = children(() => c.description);
  const footer = children(() => c.footer);
  const actions = children(() => c.actions);
  const actionsLead = children(() => c.actionsLead);
  // Report the (single) resolved title's kind up to the <dialog>'s own aria
  // attributes, which live outside the Provider and so can't read title here.
  createEffect(() => local.setTitleIsString(typeof title() === 'string'));

  return (
    // Initial focus lands HERE by default, not on the first field
    // (ui-standards › accessibility › keyboard): showModal() focuses the first
    // autofocus-bearing element, and without this the first field takes it —
    // which pops an autocomplete's listbox open unprompted (Combobox opens on
    // focus by design). tabindex=-1 makes the panel programmatically
    // focusable; the first Tab reaches the first control.
    //
    // This panel wins over any `autofocus` a caller puts on a field: it is the
    // first autofocus candidate in tree order. A dialog that genuinely should
    // open on a control declares `initialFocus` (see the effect above) —
    // `autofocus` on a field inside a Dialog does nothing.
    <div class={styles.body} tabindex="-1" autofocus>
      <Show when={c.closeButton && c.dismissable !== false}>
        <button
          type="button"
          class={styles.close}
          aria-label={t('button.close')}
          onClick={() => c.onClose()}
        >
          <CloseIcon />
        </button>
      </Show>
      <header
        class={styles.header}
        classList={{ [styles.srOnly ?? '']: c.titleHidden === true }}
        data-align={c.headerAlign === 'start' ? 'start' : undefined}
      >
        <Show when={icon()}>
          <span class={styles.icon}>{icon()}</span>
        </Show>
        {/* A string title is the <h2> (and the aria-labelledby target); a
            component title renders inline in the same heading slot (the
            accessible name then comes from ariaLabel on the dialog). */}
        <Show
          when={typeof title() === 'string'}
          fallback={<div class={styles.title}>{title()}</div>}
        >
          <h2 class={styles.title} id={local.titleId}>
            {title()}
          </h2>
        </Show>
        <Show when={headerActions()}>
          <div class={styles.headerActions}>{headerActions()}</div>
        </Show>
      </header>
      {/* Only THIS region scrolls (see .scroll in the CSS). The header above
          and the bottom region below sit outside the scroll container, so the
          buttons hold perfectly still — no shift when a scrollbar appears, no
          drift with overscroll — while over-tall content scrolls between
          them. */}
      <div class={styles.scroll}>
        <Show when={description()}>
          <p class={styles.description} id={local.descriptionId}>
            {description()}
          </p>
        </Show>
        {c.children}
      </div>
      {/* Footer + actions share one bottom region pinned under the scroll
          area, so they stay on the dialog's bottom edge together. */}
      <Show when={footer() || actions()}>
        <div class={styles.bottom}>
          <Show when={footer()}>
            <div>{footer()}</div>
          </Show>
          <Show when={actions()}>
            <div
              class={styles.actions}
              data-has-lead={actionsLead() ? '' : undefined}
            >
              {/* Lead content sits at the inline-start; the buttons group at the
                  inline-end. */}
              <Show when={actionsLead()}>
                <div class={styles.actionsLead}>{actionsLead()}</div>
              </Show>
              <div class={styles.actionsButtons}>{actions()}</div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
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
  // Whether the in-flight pointer gesture has hit ONLY the ::backdrop so far —
  // the scrim-dismiss decision, made at `click`. Plain `let`, not a signal:
  // nothing renders from it (see the handlers at the bottom of the element).
  let scrimGesture = false;
  const titleId = createUniqueId();
  const descriptionId = createUniqueId();
  // Popups (Select / Combobox) opened inside this dialog must MOUNT INTO it,
  // not <body> — see ui/utils/portalMount.ts for why (top-layer + inert
  // interaction). We expose the dialog element via PortalMountContext
  // (provided below); a nested popup reads it (usePortalMount) and mounts
  // there. The dialog box is overflow:visible (the clip lives on the inner
  // .body) so the popup isn't cut off.
  //
  // Context reaches a component only through the OWNER tree, and a <Provider>
  // in JSX owns only its JSX DESCENDANTS. So a popup-bearing slot (title,
  // description, footer, actions, …) resolves the context correctly ONLY if it
  // is CONSTRUCTED under the Provider — not merely read from there. That is why
  // every such slot is resolved inside <DialogContent> below (a child of the
  // Provider), NOT here in Dialog's own scope: resolving `children(() =>
  // props.title)` at THIS scope constructs it under Dialog's owner, where no
  // Provider exists, so usePortalMount() returns undefined and the popup falls
  // back to the <body> portal — painted behind the top-layer dialog and inert.
  // (That was the regression behind the add-item picker showing behind the
  // modal.) Resolving each slot via children() also constructs it once per
  // open rather than once per read site — a JSX-element prop is a getter, so N
  // raw reads = N constructions, each firing its own initial fetch (#549).
  const [dialogEl, setDialogEl] = createSignal<HTMLElement>();
  // Large ("workbench") modals go full-screen on tablet portrait and phones —
  // the same "narrow viewport" line as the nav overlay, so we reuse navOverlay
  // (1024) rather than mint a fourth breakpoint. data-fullscreen drives the
  // CSS; the cutoff lives once in breakpoints.ts (createMediaQuery).
  const fullscreen = useIsNavOverlay();
  // The <dialog>'s OWN aria-labelledby/aria-label depend on whether the title
  // is a string, but the title is resolved inside the Provider (DialogContent),
  // not here — so DialogContent reports it back via this signal rather than us
  // reading (and mis-constructing) the title in this scope.
  const [titleIsString, setTitleIsString] = createSignal(false);

  /*
   * Which footer button confirms this dialog (spec/keyboard KB-E2). The Dialog
   * cannot inspect `actions` — it is opaque JSX, and this shell stays layout-only
   * (kdd/explicit-composition) — so each StandardButton claims its ROLE here and
   * the Dialog reads the role, never a behaviour. See feedback/dialogConfirm.ts.
   *
   * Plain object + Map, not a signal: nothing RENDERS from a claim. Both readers
   * run at keypress time (the Enter handler) or on demand (the Alt+S action), so
   * a signal would only add churn and a remount risk.
   *
   * The provider wraps the whole dialog body rather than just the footer. Slot
   * construction happens inside DialogContent, so scoping to the footer alone
   * would mean moving that `children()` call — and no `headerActions` in the app
   * contains a standard confirm button, so the wider scope claims nothing extra.
   * A confirm button deliberately placed in `headerActions` WOULD claim the
   * footer's role; that is the constraint this note records.
   */
  const claims = new Map<ConfirmRole, ConfirmClaim>();
  const confirmSlots: DialogConfirmSlots = {
    claim: (role, claim) => {
      // Two buttons claiming one role means the footer has two confirms and only
      // one of them answers Enter — an authoring mistake, not a state the spec
      // has. Dev-only: in production the last claim simply wins.
      if (import.meta.env.DEV && claims.has(role))
        console.warn(
          `Dialog: two footer buttons claim the "${role}" confirm role. Enter will activate only one of them (spec/keyboard KB-E2).`
        );
      claims.set(role, claim);
    },
    // Identity-checked: a <Show> swap can mount the replacement before the old
    // one's cleanup runs, and an unchecked delete would clear the new claim.
    release: (role, claim) => {
      if (claims.get(role) === claim) claims.delete(role);
    },
    get: role => claims.get(role),
  };

  /*
   * A bespoke confirm that forgets `confirms` answers no Enter (KB-E2), fails
   * silently, and is invisible until somebody tries the keyboard. Dev-only, this
   * finds it — the enforcement the design otherwise leaves to review across ~57
   * call sites.
   *
   * The test is UNCLAIMED FOOTER BUTTONS, not "no confirm claimed". Several
   * dialogs legitimately show no confirm in some state — the line editor's
   * item-search state offers only Cancel, and its Save appears once an item
   * loads — so "the footer holds a button that declared no role" is the signal,
   * and a dialog whose every button declares one is silent whatever the roles
   * are. `enterConfirms={false}` opts out entirely.
   *
   * Deferred a microtask: the footer buttons claim in their own onMount, which is
   * queued after this effect.
   */
  if (import.meta.env.DEV) {
    let warned = false;
    createEffect(() => {
      if (!props.open || props.enterConfirms === false || warned) return;
      // Presence check via `in`, never a read — reading the getter here would
      // construct the actions outside the Provider (see the note on `title`).
      if (!('actions' in props)) return;
      queueMicrotask(() => {
        if (warned || !props.open) return;
        // Direct children only: a composite control (a SplitButton's pair) is
        // nested in its own wrapper and is not a footer action, so it is not
        // counted and cannot raise a false alarm.
        const buttons = dialog.querySelectorAll(
          `.${styles.actionsButtons ?? ''} > button`
        ).length;
        if (buttons <= claims.size) return;
        warned = true;
        console.warn(
          `Dialog: ${buttons - claims.size} of ${buttons} footer button(s) declare no confirm role, so Enter cannot reach them. Use a StandardButton, or pass \`confirms="plain"\` on a bespoke confirm — or \`enterConfirms={false}\` if this dialog deliberately has no submit key (spec/keyboard KB-E2).`
        );
      });
    });
  }

  /*
   * KB-E2's choice: "where a continuing action (Save & next) is present and
   * enabled, Enter activates THAT; otherwise it activates the plain confirming
   * action. A disabled action MUST NOT be activated, and Enter then does
   * nothing" (AC-KB23, AC-KB24).
   */
  const enterTarget = (): ConfirmClaim | undefined => {
    const continuing = claims.get('continuing');
    if (continuing && !continuing.disabled()) return continuing;
    const plain = claims.get('plain');
    return plain && !plain.disabled() ? plain : undefined;
  };

  /*
   * Which controls Enter confirms FROM. A WHITELIST, not a blacklist: a blacklist
   * breaks silently the first time a new widget is added, while a whitelist
   * merely fails to help — the right direction for a convenience feature.
   *
   * The panel itself, plus text-ish <input>s. Deliberately excluded:
   *   <textarea>  Enter inserts a newline (KB-E2 says "from anywhere in its
   *               FORM", and a textarea's Enter is its own).
   *   buttons/links  they self-activate as the keydown's default action, so
   *               confirming here too would double-fire (KB-E4, AC-KB26).
   *   listboxes/comboboxes with an open popup  they preventDefault, caught by
   *               the defaultPrevented guard (KB-E1, AC-KB21).
   */
  const enterConfirmsFrom = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    if (target.classList.contains(styles.body ?? '')) return true;
    if (target.tagName !== 'INPUT') return false;
    // NOT isTextEntry: that predicate answers a different question (does a
    // keystroke here mean TEXT), and its answers diverge from this one in both
    // directions. A radio or checkbox is not text entry — Alt+N must still fire
    // on it — but Enter there DOES natively submit a form, so it confirms
    // (Space is what toggles). Conversely a textarea IS text entry but keeps
    // Enter for its newline, and it is excluded above by the tag check.
    return !SELF_ACTIVATING_INPUT_TYPES.has(
      (target.getAttribute('type') ?? 'text').toLowerCase()
    );
  };

  createEffect(() => {
    if (props.open && !dialog.open) {
      dialog.showModal();
      // showModal() has just parked focus on the panel (see .body below). A
      // dialog that declares an initial-focus control overrides that here —
      // ONE place that knows when the dialog opened, instead of every modal
      // hand-rolling an onMount + requestAnimationFrame of its own. The handle
      // defers a frame and waits for its control to attach, so this is
      // correct even when the target renders behind a <Show> or a pending load.
      props.initialFocus?.focus();
    } else if (!props.open && dialog.open) dialog.close();
  });

  // Solid removes the node on unmount, but close() while still connected also
  // releases the top layer + restores focus deterministically.
  onCleanup(() => dialog.open && dialog.close());

  /*
   * The DIALOG TIER (KB-1) and the palette's dialog-contributed entries
   * (ui-surface S1: "Dialog-contributed, present only while a dialog is open —
   * Save and Cancel, each showing its keys").
   *
   * `disabled` is what gates them on `props.open`: dialog content stays
   * MOUNTED while closed (several call sites keep the <Dialog> rendered and
   * flip `open`), so a plain unconditional registration would leave Save in
   * the palette for a dialog nobody can see. Gating via `disabled` rather than
   * conditional creation keeps the action's lifetime tied to this component
   * and out of an effect, where re-runs would churn the registration
   * (kdd/keyboard-layer).
   *
   * Alt+S is `surface` tier, so it fires from inside a text field — the whole
   * point of the dialog tier (AC-KB2). Escape needs no action to work: the
   * UA's close request handles it, and the binding is declared on CancelButton
   * purely so the badge and this entry can render it.
   *
   * Alt+S targets the PLAIN confirm, never `enterTarget()`. KB-E2's "a
   * continuing action wins" is about ENTER, whose target is implicit — the
   * user pressed a general "go on" key and the footer decides what that means.
   * Alt+S is the Save button's OWN binding: it is the key that button
   * advertises on its badge (AC-KB15), so running Save & next from it would
   * fire an action the user did not aim at, and one whose badge sits on a
   * different button.
   */
  const saveTarget = (): ConfirmClaim | undefined => {
    const plain = claims.get('plain');
    return plain && !plain.disabled() ? plain : undefined;
  };
  createAction({
    name: 'button.save',
    shortcut: ALT_S,
    run: () => saveTarget()?.activate(),
    disabled: () => !props.open || saveTarget() === undefined,
  });
  createAction({
    name: 'button.cancel',
    shortcut: ESCAPE,
    run: () => claims.get('cancel')?.activate(),
    disabled: () =>
      !props.open ||
      claims.get('cancel') === undefined ||
      claims.get('cancel')?.disabled() === true,
  });

  return (
    <dialog
      ref={el => {
        dialog = el;
        setDialogEl(el);
      }}
      classList={{
        [styles.dialog ?? '']: true,
        [styles.large ?? '']: props.size === 'large',
        [styles.chromeless ?? '']: props.chromeless === true,
      }}
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
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          return;
        }
        if (event.key !== 'Enter') return;
        if (props.enterConfirms === false) return;
        // A rung inside the dialog already claimed it: an open picker selecting
        // its highlighted option (KB-E1/AC-KB21), or a field claiming Enter for
        // its own completion — the prescription abbreviation field expanding
        // into directions (KB-E6/AC-KB27). Solid's delegated walk reaches the
        // field before this handler, so its preventDefault lands first.
        if (event.defaultPrevented) return;
        // A held key must not submit twice (AC-KB26).
        if (event.repeat || event.isComposing) return;
        if (!enterConfirmsFrom(event.target)) return;
        // From here Enter is ours, so consume it either way — with every confirm
        // disabled, "Enter then does nothing" (AC-KB24) and it must not fall
        // through to an implicit form submission either.
        event.preventDefault();
        // A nested dialog (a ConfirmDialog inside a line editor) is a DOM
        // DESCENDANT of the outer one, so without this the outer dialog would
        // confirm as well.
        event.stopPropagation();
        enterTarget()?.activate();
      }}
      // Native close paths (Escape now; browser `closedby` UI later) land
      // here — report them so the parent's `open` stays the source of truth.
      onClose={() => props.open && props.onClose()}
      // Scrim-click dismiss. An event whose target is the <dialog> itself hit
      // the ::backdrop: the inner .body covers the dialog box completely (the
      // dialog has zero padding for exactly this reason), so content clicks
      // can't match.
      //
      // The dismiss must land on `click`, and NOT on pointerdown/pointerup —
      // both of those close the dialog mid-gesture, and on touch that
      // click-throughs onto the page behind. A tap dispatches
      // pointerdown/pointerup, then touchend, and only then the compatibility
      // mousedown/mouseup/click — which are hit-tested AFRESH at that moment.
      // Close before they fire and the ::backdrop is gone, so the tap is
      // re-targeted to whatever is now under the finger: a row's onRowClick
      // (i.e. a navigation) instead of a dismiss. Mouse input hides this — the
      // UA fires `click` at the nearest common ancestor of the mousedown and
      // mouseup targets, which is <body> once the dialog has closed, so no row
      // ever sees it. Verified across tap / drag-out / drag-in on both inputs.
      //
      // All three events are then required to have hit the backdrop, matching
      // the platform's own light-dismiss rule: a gesture that starts or ends on
      // dialog CONTENT is not a scrim click, so selecting text and releasing
      // over the scrim doesn't dismiss.
      onPointerDown={event => {
        scrimGesture = event.target === dialog;
      }}
      onPointerUp={event => {
        scrimGesture = scrimGesture && event.target === dialog;
      }}
      onClick={event => {
        const fromScrim = scrimGesture;
        scrimGesture = false;
        if (fromScrim && event.target === dialog && props.dismissable !== false)
          props.onClose();
      }}
    >
      <PortalMountContext.Provider value={dialogEl}>
        {/* Resets KB-S2's "in a table cell" fact. A line editor is opened FROM a
            row, so it renders inside that row's subtree and Solid contexts follow
            the owner tree — without this every NumberField in the modal would
            believe it was in a cell and stop stepping on the arrows. */}
        <InTableCellContext.Provider value={false}>
          {/* Dialog content stays MOUNTED while closed, so an action declared
              inside it would keep answering its keys for a surface nobody can
              see — and an `always`-tier bare character would fire app-wide.
              createAction folds this flag into every such action's `disabled`
              (see utils/surfaceActive.ts); Dialog's own two registrations are
              created outside this Provider and carry their own `props.open`
              gate. */}
          <SurfaceActiveContext.Provider value={() => props.open}>
            <DialogConfirmContext.Provider value={confirmSlots}>
              <DialogContent
                content={props}
                titleId={titleId}
                descriptionId={descriptionId}
                setTitleIsString={setTitleIsString}
              />
            </DialogConfirmContext.Provider>
          </SurfaceActiveContext.Provider>
        </InTableCellContext.Provider>
      </PortalMountContext.Provider>
    </dialog>
  );
};
