import { children, Show, splitProps, type JSX } from 'solid-js';
import { createRipple } from '../../utils/createRipple';
import { Ripple } from './Ripple';
import { ShortcutBadge } from '../keyboard/ShortcutBadge';
import {
  ALT_S,
  ESCAPE,
  ariaKeyshortcuts,
  type Shortcut,
} from '../../utils/shortcuts';
import { createConfirmClaim } from './createConfirmClaim';
import type { ConfirmRole } from '../feedback/dialogConfirm';
import styles from './Button.module.css';

/*
 * Whether a labelled Button sheds its label down to just the icon on phone
 * widths (≤767px, ui-standards #btn-icons) WITHOUT an explicit `collapsible`
 * prop. Off for now — collapsing is opt-in per button. This is the single
 * switch to make collapse the app-wide default later: flip it to `true` and
 * every labelled button collapses on phones unless it passes `collapsible={false}`.
 */
const COLLAPSIBLE_BY_DEFAULT = false;

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: JSX.Element;
  /**
   * Semantic tone (ui-standards #btn-variants). Never named after a colour —
   * the variant maps to palette tokens in the CSS (Carl, 2026-07-09):
   *   'primary'   (default) — the single most important action; filled.
   *   'secondary' — supporting actions (Print, Export, Cancel…); outlined.
   *   'ghost'     — optional/low-priority + inline table actions; text only.
   *   'danger'    — a strong "be careful with this" action (delete, void);
   *                 filled brand-orange tone, not a hard error-red.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /**
   * Size (ui-standards #btn-sizes): 'medium' (default) for page/toolbar
   * actions, 'small' for dense tables and compact panels. Medium grows to the
   * touch target at tablet widths; small stays dense.
   */
  size?: 'medium' | 'small';
  /** Which side of the label the icon sits on (mirrors in RTL). */
  iconPosition?: 'start' | 'end';
  /**
   * Busy state: shows a spinner in place of the icon, disables the button and
   * marks it
   *  aria-busy (so a click can't re-fire an in-flight action). */
  loading?: boolean;
  /**
   * Collapse to just the icon on phone widths (≤767px) to save toolbar space
   * (ui-standards #btn-icons). Opt-in, and only meaningful with an `icon`. The
   * label stays in the DOM (visually hidden), so the button keeps its
   * accessible name — no aria-label needed. Omit to use the app default
   * (COLLAPSIBLE_BY_DEFAULT, currently off); `collapsible={false}` always opts
   * out even if that default flips.
   */
  collapsible?: boolean;
  /**
   * The key binding this button answers (spec/keyboard KB-H1, S2). ONE prop
   * drives both the accessible name of the binding (`aria-keyshortcuts`) and the
   * hint badge revealed while Alt or Ctrl is held, so the two can never drift
   * apart (AC-KB15).
   *
   * The button does NOT dispatch the key — the screen registers the action
   * (`createAction` / `createAddAction`) and the dispatcher runs it. That split
   * is deliberate: a screen may render two controls for one action (the inbound
   * and internal-order details each have a header SplitButton AND a ghost button
   * in the table's empty slot), and the action's `run` is often broader than one
   * button's click (kdd/keyboard-layer).
   */
  shortcut?: Shortcut;
  /**
   * This button's role in a surrounding `<Dialog>`'s footer, which is how the
   * dialog knows what `Enter` should activate (spec/keyboard KB-E2) and what to
   * contribute to the command palette while it is open.
   *
   * The four `StandardButtons` set this for you — prefer those. Set it by hand
   * only for a confirm with a BESPOKE LABEL, which D55 says must stay a plain
   * `<Button>` rather than become a mislabelled standard one: _Create_,
   * _Delete lines_, _Apply_, _Next step_.
   *
   * Read once at setup: a button does not change its footer role at runtime.
   * Outside a `<Dialog>` it does nothing.
   */
  confirms?: ConfirmRole;
}

/*
 * Reusable action button — plain <button> + CSS, no component library. Flat
 * per ui-standards (#btn-variants): filled primary/danger, outlined secondary,
 * text-only ghost; two sizes; a subtle ripple on click (createRipple). Tone +
 * shape live entirely in Button.module.css; this file is just structure.
 */
export const Button = (props: ButtonProps) => {
  const [local, rest] = splitProps(props, [
    'icon',
    'variant',
    'size',
    'iconPosition',
    'loading',
    'collapsible',
    'children',
    'class',
    'type',
    'disabled',
    'onPointerDown',
    'shortcut',
    'confirms',
    // Applied explicitly below: Solid only compiles `ref` specially when it is a
    // STATIC attribute, so a ref arriving through `{...rest}` would be silently
    // dropped. The dialog confirm-claim depends on getting the element.
    'ref',
  ]);
  // The footer-role claim, if this button declares one. Registers on mount and
  // releases on cleanup, so a <Show>-gated Save & next hands its role back when
  // the gate closes.
  const claimRef = createConfirmClaim(() => local.confirms, props);

  /*
   * The binding this button advertises. Derived from the claimed ROLE where the
   * role implies one, so claiming the role IS declaring the binding and there is
   * no second prop to forget:
   *
   *   plain  → Alt+S, the dialog tier's Save (KB-1). The <Dialog> registers that
   *            binding against whichever button holds this role, so a bespoke
   *            confirm (_Create_, _Delete lines_) advertises it too.
   *   cancel → Escape, which the UA's close request already performs.
   *
   * An explicit `shortcut` still wins, for a control whose binding is nothing to
   * do with a dialog footer (the shared add control's Alt+N).
   */
  const shortcut = (): Shortcut | undefined => {
    if (local.shortcut) return local.shortcut;
    if (local.confirms === 'plain') return ALT_S;
    if (local.confirms === 'cancel') return ESCAPE;
    return undefined;
  };
  const ripple = createRipple();
  // JSX-element props are lazy getters: each is read twice below (the <Show>
  // test + the insertion), and raw reads would create the passed element twice
  // per evaluation — resolve once (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => local.icon);
  const label = children(() => local.children);

  return (
    <button
      ref={el => {
        claimRef(el);
        if (typeof local.ref === 'function')
          (local.ref as (e: HTMLButtonElement) => void)(el);
      }}
      type={local.type ?? 'button'}
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      data-variant={local.variant ?? 'primary'}
      data-size={local.size ?? 'medium'}
      data-icon-position={local.iconPosition ?? 'start'}
      data-collapsible={
        (local.collapsible ?? COLLAPSIBLE_BY_DEFAULT) ? '' : undefined
      }
      disabled={local.disabled || local.loading}
      aria-busy={local.loading || undefined}
      // The ARIA grammar, not the platform spelling — the badge renders the
      // human form from the same value (KB-M1, AC-KB15).
      aria-keyshortcuts={shortcut() ? ariaKeyshortcuts(shortcut()!) : undefined}
      // The badge positions itself against this button; `.button` is already
      // `position: relative` for the ripple, so it is already the positioning
      // context. It is also `overflow: hidden` for the same reason, which is why
      // the badge sits just INSIDE the corner rather than outside it.
      onPointerDown={event => {
        if (local.loading) return;
        ripple.onPointerDown(event);
        if (typeof local.onPointerDown === 'function')
          local.onPointerDown(event);
      }}
      {...rest}
    >
      {/* Spinner replaces the icon while loading. */}
      <Show
        when={local.loading}
        fallback={
          <Show when={icon()}>
            <span class={styles.icon}>{icon()}</span>
          </Show>
        }
      >
        <span class={styles.spinner} aria-hidden="true" />
      </Show>
      <Show when={label()}>
        <span class={styles.label}>{label()}</span>
      </Show>
      <Show when={shortcut()}>
        {shortcut => <ShortcutBadge shortcut={shortcut()} />}
      </Show>
      <Ripple ripples={ripple.ripples()} onDone={ripple.dismiss} />
    </button>
  );
};
