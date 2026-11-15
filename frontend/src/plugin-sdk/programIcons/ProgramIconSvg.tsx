/*
 * One program icon, drawn from its shape (programIconData.ts): the lazy half
 * of `ProgramIcon`, in the same chunk as the data. Its gradients run from the
 * error red to the brand orange, the nearest tokens to the old client's
 * `iconGradientStart` and `iconGradientStop`, and each instance numbers its
 * gradients from its own unique id, since two copies of an icon on one page
 * would otherwise share ids and the second would paint with the first's.
 */
import { For, createUniqueId, type JSX } from 'solid-js';
import { programIconNames, programIconShapes } from './programIconData';
import type { ProgramIconProps } from './ProgramIcon';
import styles from './ProgramIcon.module.css';

export const ProgramIconSvg = (props: ProgramIconProps): JSX.Element => {
  const id = createUniqueId();
  const shape = () => programIconShapes[programIconNames[props.name]];
  return (
    <svg
      viewBox="0 0 60 60"
      width="1em"
      height="1em"
      fill="none"
      class={props.class}
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : 'true'}
    >
      <For each={shape().paths}>
        {path => (
          <path
            d={path.d}
            fill={`url(#${id}-${path.g})`}
            fill-rule={'evenOdd' in path ? 'evenodd' : undefined}
            clip-rule={'evenOdd' in path ? 'evenodd' : undefined}
          />
        )}
      </For>
      <defs>
        <For each={shape().gradients}>
          {([x1, y1, x2, y2], index) => (
            <linearGradient
              id={`${id}-${index()}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              gradientUnits="userSpaceOnUse"
            >
              <stop class={styles.start} />
              <stop offset="1" class={styles.end} />
            </linearGradient>
          )}
        </For>
      </defs>
    </svg>
  );
};
