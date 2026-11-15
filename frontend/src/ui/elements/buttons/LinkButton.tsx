import { A } from '@solidjs/router';
import {
  children,
  Show,
  splitProps,
  type ComponentProps,
  type JSX,
} from 'solid-js';
import type { ButtonProps } from './Button';
import { collapseTier, type Collapsible } from './collapsible';
import styles from './Button.module.css';

export interface LinkButtonProps extends ComponentProps<typeof A> {
  /** The destination, router-space — what `navigate()` takes. */
  href: string;
  icon?: JSX.Element;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  iconPosition?: ButtonProps['iconPosition'];
  collapsible?: Collapsible;
}

/*
 * LinkButton — a control that looks like a Button but GOES somewhere: another
 * screen, with nothing else to do first (#271). It is the router's `<A>`, so it
 * is a real link: right-click → "Open link in new tab", Cmd/Ctrl-click and
 * middle-click do what the user's browser does with a link, and the router
 * keeps a plain click in the app. `<A>` resolves `href` against the mount, as
 * RecordLink's does.
 *
 * Only for pure navigation. A button that saves, confirms or closes first and
 * moves on after is still a Button — there is nothing to open in a new tab.
 * Shares Button.module.css, so the two can't drift; no ripple, since the click
 * leaves the screen.
 */
export const LinkButton = (props: LinkButtonProps): JSX.Element => {
  const [local, rest] = splitProps(props, [
    'icon',
    'variant',
    'size',
    'iconPosition',
    'collapsible',
    'children',
    'class',
  ]);
  // Each is read twice below (the <Show> test + the insertion) — resolve once
  // (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => local.icon);
  const label = children(() => local.children);

  return (
    <A
      {...rest}
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      data-variant={local.variant ?? 'primary'}
      data-size={local.size ?? 'medium'}
      data-icon-position={local.iconPosition ?? 'start'}
      data-collapsible={collapseTier(local.collapsible)}
    >
      <Show when={icon()}>
        <span class={styles.icon}>{icon()}</span>
      </Show>
      <Show when={label()}>
        <span class={styles.label}>{label()}</span>
      </Show>
    </A>
  );
};
