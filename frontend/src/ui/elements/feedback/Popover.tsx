import { createUniqueId, onCleanup, onMount, type JSX } from 'solid-js'
import styles from './Popover.module.css'

export type PopoverPlacement =
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'top'
  | 'top-start'
  | 'top-end'

export interface PopoverProps {
  /** Trigger content (an icon, some text) — rendered inside the invoker button. */
  trigger: JSX.Element
  /** Accessible name for the trigger — required when the trigger is icon-only. */
  triggerLabel?: string
  /** Extends the bare trigger button's styling. */
  triggerClass?: string
  /** Preferred side/alignment; flips to the other side rather than overflow.
      start/end are logical (mirror in RTL). Default 'bottom'. */
  placement?: PopoverPlacement
  class?: string
  children: JSX.Element
}

/* Gap between trigger and panel, and the viewport edge the panel never
   crosses. Pixel values because this is measured geometry (like the tab
   underline), not layout spacing. */
const GAP = 4
const EDGE = 8

/*
 * Popover — native Popover API (`popover="auto"`), NO library (the RnD
 * prototype bought Radix Popover — see DECISIONS.md 2026-07-09). The platform
 * covers what Radix was bought for: top layer (escapes scroll-container
 * clipping with no portal), light dismiss + Escape, focus handed back to the
 * invoker, and the invoker's aria-expanded (auto-wired via `popovertarget`;
 * we also set it explicitly for older engines). What the platform does NOT
 * cover yet is anchoring: CSS anchor positioning is too newly Baseline to
 * rely on (Firefox 147 / Safari 26), so placement is our own measured
 * geometry below — flip on the main axis, clamp on the cross axis — and can
 * migrate to pure CSS once support matures, with no API change.
 *
 * For content bubbles (a table row's comment, help text) — NOT a menu: a menu
 * needs roving focus + typeahead, which stays a Kobalte DropdownMenu buy.
 */
export const Popover = (props: PopoverProps) => {
  let trigger!: HTMLButtonElement
  let panel!: HTMLDivElement
  const panelId = createUniqueId()

  const place = () => {
    // No box yet = the engine hasn't finished displaying the popover (the
    // exact interleaving varies) — retry pre-paint, so no wrong frame shows.
    if (panel.offsetHeight === 0) {
      requestAnimationFrame(place)
      return
    }
    const t = trigger.getBoundingClientRect()
    // Layout size, not getBoundingClientRect — the entry animation's scale()
    // shrinks the rect while it plays, which would mis-place by a few px.
    const p = { width: panel.offsetWidth, height: panel.offsetHeight }
    const [side = 'bottom', align = 'center'] = (
      props.placement ?? 'bottom'
    ).split('-')

    // Logical → physical alignment against the trigger's writing direction.
    const rtl = getComputedStyle(trigger).direction === 'rtl'
    const alignLeft = align === 'center' ? null : (align === 'start') !== rtl
    let left =
      alignLeft === null
        ? t.left + t.width / 2 - p.width / 2
        : alignLeft
          ? t.left
          : t.right - p.width
    left = Math.max(EDGE, Math.min(left, window.innerWidth - p.width - EDGE))

    const below = t.bottom + GAP
    const above = t.top - p.height - GAP
    let top = side === 'top' ? above : below
    // Flip rather than overflow — only when the other side actually fits.
    if (side === 'bottom' && below + p.height > window.innerHeight - EDGE && above >= EDGE)
      top = above
    else if (side === 'top' && above < EDGE && below + p.height <= window.innerHeight - EDGE)
      top = below

    panel.style.top = `${Math.round(top)}px`
    panel.style.left = `${Math.round(left)}px`
  }

  // rAF-throttled re-place while open (scroll of any ancestor, resize).
  let raf = 0
  const replace = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      place()
    })
  }

  const stopTracking = () => {
    window.removeEventListener('scroll', replace, true)
    window.removeEventListener('resize', replace)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  onMount(() => {
    // beforetoggle fires synchronously just before the popover is shown/
    // hidden, so a microtask queued here runs after it IS shown (it has a
    // box to measure) but before the next paint — no misplaced first frame.
    panel.addEventListener('beforetoggle', (event) => {
      const open = (event as ToggleEvent).newState === 'open'
      trigger.setAttribute('aria-expanded', String(open))
      if (open) {
        queueMicrotask(place)
        window.addEventListener('scroll', replace, { capture: true, passive: true })
        window.addEventListener('resize', replace)
      } else {
        stopTracking()
      }
    })
  })

  onCleanup(stopTracking)

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popovertarget={panelId}
        class={
          props.triggerClass
            ? `${styles.trigger} ${props.triggerClass}`
            : styles.trigger
        }
        aria-label={props.triggerLabel}
      >
        {props.trigger}
      </button>
      <div
        ref={panel}
        id={panelId}
        popover="auto"
        class={props.class ? `${styles.panel} ${props.class}` : styles.panel}
      >
        {props.children}
      </div>
    </>
  )
}
