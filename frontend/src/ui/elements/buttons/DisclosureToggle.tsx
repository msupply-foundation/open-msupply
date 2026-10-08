import { splitProps, type JSX } from 'solid-js';
import { Button, type ButtonProps } from './Button';
import { ChevronDownIcon } from '../../icons';
import styles from './DisclosureToggle.module.css';

export interface DisclosureToggleProps extends Omit<
  ButtonProps,
  'icon' | 'iconPosition' | 'variant' | 'type' | 'aria-expanded'
> {
  /**
   * Whether the region it controls is currently revealed — drives both the
   * chevron's direction and `aria-expanded`. Caller-owned: the toggle holds no
   * state of its own, it flips the caller's on click.
   */
  expanded: boolean;
  /** `id` of the revealed region, for `aria-controls`. */
  controls?: string;
  /** The label, already translated ("Show advanced options"). */
  children: JSX.Element;
}

/*
 * DisclosureToggle — the "Show / Hide advanced options" control that reveals a
 * form's optional extras (site initialisation's and the Synchronisation
 * settings form's sync batch size). A ghost Button plus a chevron that rotates
 * to point at the state it will move to, the accordion/SidePanel convention
 * (up/down rotation, no RTL mirroring) — so a disclosure inside a form reads
 * the same as a collapsible section around one.
 *
 * Not an Accordion: that owns a titled section's whole header row and its
 * expanded panel. This is a control the form places inline, revealing whatever
 * the caller renders next — so the caller keeps the fields in its own JSX
 * (explicit composition) rather than handing them over as a panel.
 */
export const DisclosureToggle = (props: DisclosureToggleProps) => {
  const [local, rest] = splitProps(props, ['expanded', 'controls', 'children']);
  return (
    <Button
      {...rest}
      type="button"
      variant="ghost"
      size="small"
      aria-expanded={local.expanded}
      aria-controls={local.controls}
      icon={
        <ChevronDownIcon
          class={
            local.expanded
              ? `${styles.chevron} ${styles.expanded}`
              : styles.chevron
          }
          aria-hidden="true"
        />
      }
    >
      {local.children}
    </Button>
  );
};
