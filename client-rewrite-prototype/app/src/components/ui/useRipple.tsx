import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import styles from './Ripple.module.css';

interface RippleInstance {
  id: number;
  x: number;
  y: number;
  size: number;
}

/*
 * Subtle click ripple, MUI-style. Returns an onPointerDown to attach to the host
 * (which must be position:relative) and the ripple nodes to render inside it. On
 * press it spawns a circle at the click point that expands to cover the host and
 * fades out; each ripple removes itself on animationend. Skipped under
 * prefers-reduced-motion. Colour is the host's --ripple-color.
 *
 * WHY THIS ONE NEEDS JS (most of our interaction is pure CSS): the ripple must
 * originate at the exact pointer position, and CSS has no access to click
 * coordinates — so we read them from the pointer event and set the ripple's
 * left/top/size inline. We also spawn a fresh element per click so overlapping
 * clicks each animate independently (a single CSS animation can't restart
 * reliably mid-play). The animation itself is still CSS; JS only supplies the
 * per-click position + element. This is the deliberate exception, kept tiny.
 */
export const useRipple = () => {
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const nextId = useRef(0);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    setRipples(current => [
      ...current,
      {
        id: nextId.current++,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        size,
      },
    ]);
  };

  const rippleNodes: ReactNode = (
    <span className={styles.container} aria-hidden>
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className={styles.ripple}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
          onAnimationEnd={() =>
            setRipples(current => current.filter(r => r.id !== ripple.id))
          }
        />
      ))}
    </span>
  );

  return { onPointerDown, rippleNodes };
};
