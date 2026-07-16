import { createSignal, For, Show, type JSX } from 'solid-js';
import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { ChevronDownIcon } from '../../icons';
import { createRipple } from '../../utils/createRipple';
import { Ripple } from './Ripple';
import styles from './SplitButton.module.css';

export interface SplitButtonOption {
  value: string;
  label: string;
  /**
   * A non-selectable entry (shown greyed, can't be picked) — e.g. a
   * past/current status in a
   *  status-change menu that lists every status for context. */
  disabled?: boolean;
}

interface SplitButtonProps {
  /** Leading icon for the main action. */
  icon?: JSX.Element;
  options: SplitButtonOption[];
  /**
   * Controlled selected value; omit for uncontrolled (defaults to first
   * option).
   */
  value?: string;
  defaultValue?: string;
  /** Fired when the selection changes via the menu. */
  onValueChange?: (value: string) => void;
  /**
   * Fired when the main action runs — either the main (left) button is clicked,
   * or a menu item is picked (which selects AND acts, like the app's
   * SplitButton/ExportSelector).
   */
  onAction?: (value: string) => void;
  /** Accessible name for the caret trigger (it has no visible text). */
  menuLabel?: string;
}

/*
 * Split button — a primary action glued to a dropdown caret (Solid port of the
 * RnD prototype's ExportButton). There's no "split button" primitive: we
 * compose a plain <button> (runs the selected action) with a Kobalte
 * DropdownMenu (caret → choose an option). Mirrors the app's
 * SplitButton/ExportSelector: picking an option selects it AND runs the action.
 *
 * Each half gets its OWN ripple (inside the button, above its fill) — a single
 * ripple at the .split level would sit behind the halves and be hidden by their
 * opaque hover fill. The menu is portaled to <body>, so it inherits `dir` from
 * <html> and mirrors in RTL.
 */
export const SplitButton = (props: SplitButtonProps) => {
  const [internal, setInternal] = createSignal(
    props.defaultValue ?? props.options[0]?.value
  );
  const selectedValue = () => props.value ?? internal();
  const selectedOption = () =>
    props.options.find(o => o.value === selectedValue()) ?? props.options[0];

  const mainRipple = createRipple();
  const caretRipple = createRipple();

  const pick = (value: string) => {
    setInternal(value);
    props.onValueChange?.(value);
    props.onAction?.(value);
  };

  return (
    <div class={styles.split}>
      <button
        type="button"
        class={styles.main}
        onClick={() => props.onAction?.(selectedValue())}
        onPointerDown={mainRipple.onPointerDown}
      >
        <Show when={props.icon}>
          <span class={styles.icon}>{props.icon}</span>
        </Show>
        <span class={styles.label}>{selectedOption()?.label}</span>
        <Ripple ripples={mainRipple.ripples()} onDone={mainRipple.dismiss} />
      </button>

      <DropdownMenu.Root placement="bottom-end" gutter={4}>
        <DropdownMenu.Trigger
          class={styles.caret}
          aria-label={props.menuLabel ?? 'More options'}
          onPointerDown={caretRipple.onPointerDown}
        >
          <ChevronDownIcon class={styles.caretIcon} />
          <Ripple
            ripples={caretRipple.ripples()}
            onDone={caretRipple.dismiss}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class={styles.content}>
            <For each={props.options}>
              {option => (
                <DropdownMenu.Item
                  class={styles.item}
                  data-current={
                    option.value === selectedValue() ? 'true' : undefined
                  }
                  disabled={option.disabled}
                  onSelect={() => {
                    if (!option.disabled) pick(option.value);
                  }}
                >
                  {option.label}
                </DropdownMenu.Item>
              )}
            </For>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
