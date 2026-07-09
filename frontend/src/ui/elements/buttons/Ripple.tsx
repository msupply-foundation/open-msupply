import { For } from 'solid-js'
import type { RippleInstance } from '../../utils/createRipple'
import styles from './Ripple.module.css'

interface RippleProps {
  ripples: RippleInstance[]
  /** Called when a ripple finishes animating, so the host can drop it. */
  onDone: (id: number) => void
}

/*
 * The ripple render layer — an absolutely-positioned span inside a
 * position:relative host, holding one expanding circle per active ripple.
 * Position/size come from createRipple as measured pixel offsets, so they're
 * inline px (the deliberate exception to the rem rule — see createRipple).
 * Colour is the host's --ripple-color, which the button sets per state.
 */
export const Ripple = (props: RippleProps) => (
  <span class={styles.container} aria-hidden="true">
    <For each={props.ripples}>
      {ripple => (
        <span
          class={styles.ripple}
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: `${ripple.size}px`,
            height: `${ripple.size}px`,
          }}
          onAnimationEnd={() => props.onDone(ripple.id)}
        />
      )}
    </For>
  </span>
)
