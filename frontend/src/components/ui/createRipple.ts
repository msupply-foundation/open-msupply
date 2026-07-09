import { createSignal } from 'solid-js'

export interface RippleInstance {
  id: number
  x: number
  y: number
  size: number
}

/*
 * Subtle click ripple, MUI-style — the Solid port of the RnD prototype's
 * `useRipple`. Returns an `onPointerDown` to attach to the host (which must be
 * position:relative + overflow:hidden) and a `ripples` accessor to feed the
 * <Ripple> layer rendered inside it. On press it spawns a circle at the click
 * point that expands to cover the host and fades out; each ripple removes
 * itself on animationend (via <Ripple>'s onDone → `dismiss`). Skipped under
 * prefers-reduced-motion.
 *
 * WHY THIS ONE NEEDS JS (the rest of our interaction is pure CSS): the ripple
 * must originate at the exact pointer position, and CSS has no access to click
 * coordinates — so we read them from the pointer event and set the ripple's
 * left/top/size inline (px, because they're measured pixel offsets, not layout
 * spacing — the deliberate exception to the rem rule). We also spawn a fresh
 * element per click so overlapping clicks animate independently. The animation
 * itself is still CSS; JS only supplies the per-click position + element.
 */
export function createRipple() {
  const [ripples, setRipples] = createSignal<RippleInstance[]>([])
  let nextId = 0

  const onPointerDown = (event: PointerEvent & { currentTarget: HTMLElement }) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    setRipples(current => [
      ...current,
      {
        id: nextId++,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        size,
      },
    ])
  }

  const dismiss = (id: number) =>
    setRipples(current => current.filter(r => r.id !== id))

  return { onPointerDown, ripples, dismiss }
}
