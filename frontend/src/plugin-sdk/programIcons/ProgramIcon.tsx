/*
 * The old client's program icons, by the names its UI schemas give them
 * (`"icon": "contraceptive"`), for a form plugin's category tiles and
 * anywhere else a program form wants one. They replicate the old client's
 * multi-colour icons as they are, where the core library's icons are
 * single-colour; they live in the plugin SDK rather than src/ui/icons until
 * the forms that use them move onto the core library.
 *
 * This wrapper is the eager half and holds no shapes. The first icon to
 * render loads them (about 24 KB gzip, one chunk shared by every icon), and
 * until they arrive the icon is an empty box of its own size. It never
 * suspends, so an icon first rendered by an interaction (a dialog opening)
 * cannot remount the screen around it (kdd/solid-reactivity-pitfalls).
 */
import { Show, createSignal, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { programIconNames } from './programIconData';

/** A program icon's name: the old client's `ProgramsIcons` keys. */
export type ProgramIconName = keyof typeof programIconNames;

export interface ProgramIconProps {
  name: ProgramIconName;
  /**
   * The icon's accessible name. Without one it is decorative, hidden from
   * assistive technology, as an icon beside a text label should be.
   */
  label?: string;
  /** Sized by font-size: the icon is 1em square. */
  class?: string;
}

type IconModule = typeof import('./ProgramIconSvg');

let loaded: IconModule | undefined;
let loading: Promise<IconModule> | undefined;
const load = () =>
  (loading ??= import('./ProgramIconSvg').then(m => (loaded = m)));

export const ProgramIcon = (props: ProgramIconProps): JSX.Element => {
  const [module, setModule] = createSignal(loaded);
  if (!loaded) void load().then(m => setModule(() => m));
  return (
    <Show
      when={module()}
      fallback={
        <svg
          width="1em"
          height="1em"
          class={props.class}
          role={props.label ? 'img' : undefined}
          aria-label={props.label}
          aria-hidden={props.label ? undefined : 'true'}
        />
      }
    >
      {m => <Dynamic component={m().ProgramIconSvg} {...props} />}
    </Show>
  );
};
