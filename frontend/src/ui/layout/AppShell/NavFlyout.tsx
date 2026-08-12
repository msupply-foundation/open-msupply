import { For, Show, createEffect, onCleanup, onMount } from 'solid-js';
import { t } from '../../../intl';
import type { NavItem, NavLeaf } from './navModel';
import styles from './NavFlyout.module.css';

/** What the collapsed rail is currently showing a flyout for. */
export interface FlyoutTarget {
  item: NavItem;
  /** The rail button it hangs off — and where focus returns on dismissal. */
  anchor: HTMLElement;
  /** Opened by keyboard: park focus on the panel's first destination. */
  focusFirst?: boolean;
}

/* Measured geometry (like Popover's GAP/EDGE): the gap between the rail button
   and the panel, and the viewport margin the panel never crosses. Pixels
   because these are measurements written to style.top/left, not layout
   spacing. */
const GAP = 10;
const EDGE = 8;

/*
 * The collapsed rail's flyout: a section's children — or, for a leaf, just its
 * label — beside the icon rail. With labels hidden this is the ONLY way to a
 * child destination, so it is not decoration: collapsing the rail must not
 * hide half the app.
 *
 * Native popover (`popover="manual"`), no library: it needs the top layer so
 * the rail's own `overflow: hidden` cannot clip it, which the platform gives
 * for free (same call as Popover/Dialog — kdd/own-simple-buy-hard). `manual`
 * rather than `auto` because this one is driven entirely by the rail's
 * hover/focus intent — light dismiss would fight the hover grace period — so
 * dismissal (Escape, pointer-out, choosing a destination) is ours, and with it
 * the focus return to the anchor.
 *
 * ONE panel serves every rail item, shown/hidden by an effect on `target`,
 * mirroring Dialog's `open`-prop effect rather than mounting a popover per
 * open.
 */
export const NavFlyout = (props: {
  target: FlyoutTarget | undefined;
  selectedId: string;
  onSelect: (leaf: NavLeaf) => void;
  /** Escape / ← / a chosen destination — the boolean asks for focus back. */
  onDismiss: (restoreFocus: boolean) => void;
  /** The pointer entered the panel — the rail's close timer must stand down. */
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  /** Hands the panel to the rail, which asks whether focus is inside it. */
  ref: (el: HTMLDivElement) => void;
}) => {
  let panel!: HTMLDivElement;

  const place = (anchor: HTMLElement) => {
    const a = anchor.getBoundingClientRect();
    // Layout size, not the animated bounding box (the entry animation
    // translates the panel while it plays, which would mis-place it).
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    // The rail sits on the inline-start, so the panel opens away from it —
    // physically right in LTR, left in RTL.
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    const inlineOffset = rtl ? a.left - GAP - width : a.right + GAP;
    const left = Math.max(
      EDGE,
      Math.min(inlineOffset, window.innerWidth - width - EDGE)
    );
    // Aligned with the icon, then clamped so a long section list stays fully
    // on screen.
    const top = Math.max(
      EDGE,
      Math.min(a.top, window.innerHeight - height - EDGE)
    );
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  };

  // The panel content is inserted by render effects, which run before this
  // user effect — so the box measured here is the box about to be painted.
  createEffect(() => {
    const target = props.target;
    if (!target) {
      if (panel.matches(':popover-open')) panel.hidePopover();
      return;
    }
    if (!panel.matches(':popover-open')) panel.showPopover();
    place(target.anchor);
    if (target.focusFirst) panel.querySelector('button')?.focus();
  });

  // A window resize moves the rail button under an open panel.
  const reposition = () => {
    if (props.target && panel.matches(':popover-open'))
      place(props.target.anchor);
  };
  onMount(() => window.addEventListener('resize', reposition));
  onCleanup(() => window.removeEventListener('resize', reposition));

  return (
    <div
      ref={(el: HTMLDivElement) => {
        panel = el;
        props.ref(el);
      }}
      popover="manual"
      class={styles.flyout}
      /* A section flyout is a menu of destinations; a leaf's is a label
         tooltip, and the rail button already carries that label as its
         accessible name — so the tooltip stays out of the a11y tree rather
         than announcing it twice. */
      data-variant={props.target?.item.children ? 'menu' : 'tip'}
      role={props.target?.item.children ? 'menu' : undefined}
      aria-label={
        props.target?.item.children ? t(props.target.item.labelKey) : undefined
      }
      aria-hidden={props.target?.item.children ? undefined : 'true'}
      data-testid="nav-flyout"
      onMouseEnter={props.onPointerEnter}
      onMouseLeave={props.onPointerLeave}
      onKeyDown={e => {
        const rows = [...panel.querySelectorAll('button')];
        const at = rows.indexOf(document.activeElement as HTMLButtonElement);
        // ← (→ in RTL) walks back out to the rail, as Escape does.
        const back =
          getComputedStyle(panel).direction === 'rtl'
            ? 'ArrowRight'
            : 'ArrowLeft';
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          rows[Math.min(at + 1, rows.length - 1)]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          rows[Math.max(at - 1, 0)]?.focus();
        } else if (e.key === 'Escape' || e.key === back) {
          e.preventDefault();
          props.onDismiss(true);
        }
      }}
    >
      <Show when={props.target}>
        {target => (
          <Show
            when={target().item.children}
            fallback={
              <span class={styles.tipLabel}>{t(target().item.labelKey)}</span>
            }
          >
            {children => (
              <>
                <div class={styles.title}>{t(target().item.labelKey)}</div>
                <For each={children()}>
                  {leaf => (
                    <button
                      type="button"
                      role="menuitem"
                      class={styles.item}
                      /* The current destination: marked by a leading dot and
                         bold weight as well as colour, so the "you are here"
                         cue never rides on colour alone (ui-standards ›
                         accessibility › colour independence). */
                      data-selected={
                        leaf.id === props.selectedId ? 'true' : undefined
                      }
                      aria-current={
                        leaf.id === props.selectedId ? 'page' : undefined
                      }
                      data-testid={`nav-flyout-${leaf.id}`}
                      onClick={() => {
                        props.onSelect(leaf);
                        props.onDismiss(false);
                      }}
                    >
                      {t(leaf.labelKey)}
                    </button>
                  )}
                </For>
              </>
            )}
          </Show>
        )}
      </Show>
    </div>
  );
};
