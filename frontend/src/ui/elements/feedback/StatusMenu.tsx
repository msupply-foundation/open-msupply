import { For, Show, type JSX } from 'solid-js';
import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { CheckIcon, ChevronDownIcon } from '../../icons';
import { StatusChip } from './StatusChip';
import styles from './StatusMenu.module.css';

export interface StatusMenuOption {
  value: string;
  label: string;
  /** The option's chip colour — a `--status-*` token, as StatusChip takes. */
  colour: string;
  /**
   * Offered but not selectable (greyed), with `title` saying why — the
   * "disable with a reason" convention.
   */
  disabled?: boolean;
  title?: string;
}

export interface StatusMenuProps {
  /**
   * The chip as shown: the record's status in the words the screen uses for
   * it. May differ from `value` — an encounter still Scheduled whose date has
   * passed reads Missed, over a stored Pending.
   */
  label: string;
  colour: string;
  /** The statuses the menu offers, each with its own chip colour. */
  options: StatusMenuOption[];
  /** The stored status, which the menu marks as current. */
  value?: string;
  onSelect: (value: string) => void;
  /**
   * Accessible name for the trigger, which has no text of its own beyond the
   * chip — say what it is and what it does ("Status: Scheduled. Change
   * status").
   */
  triggerLabel: string;
  /**
   * Read-only: the chip alone, with no menu and no caret — for a record the
   * user may read but not change.
   */
  disabled?: boolean;
  /** Where the menu opens. Default `bottom-start`. */
  placement?: DropdownMenu.DropdownMenuRootProps['placement'];
  /**
   * Test-hook prefix (e2e/TESTIDS.md): `<testId>` on the trigger button (on
   * the chip's wrapper when read-only) and `<testId>-option-<value>` on each
   * menu item.
   */
  testId?: string;
}

/*
 * Status menu — a record's status chip that opens a menu of the statuses it
 * can be moved to (the encounter screen's Scheduled / Visited / Cancelled
 * beside its title; Product's program-enrolment prototype). The chip is the
 * trigger: a StatusChip plus a caret in a bare button, so the status reads as
 * a status, not as an action button; the menu lists each status as its own
 * chip and marks the current one. Kobalte DropdownMenu with a RadioGroup
 * (headless) for the trigger wiring, roving focus, type-ahead and the
 * `aria-checked` current item; our markup + CSS, the house menu look
 * (SplitButton's dense divided rows), styled off its data-* state.
 *
 * Picking an item only reports it (`onSelect`): what a status change means —
 * an edit to save, a save in itself — is the screen's. The read-only form
 * (`disabled`) renders the chip alone, since a caret with nothing behind it
 * would promise a change the user cannot make.
 */
export const StatusMenu = (props: StatusMenuProps): JSX.Element => (
  <Show
    when={!props.disabled}
    fallback={
      <span data-testid={props.testId}>
        <StatusChip label={props.label} colour={props.colour} />
      </span>
    }
  >
    <DropdownMenu.Root placement={props.placement ?? 'bottom-start'} gutter={4}>
      <DropdownMenu.Trigger
        class={styles.trigger}
        aria-label={props.triggerLabel}
        data-testid={props.testId}
      >
        <StatusChip label={props.label} colour={props.colour} />
        <ChevronDownIcon class={styles.caret} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class={styles.content}>
          <DropdownMenu.RadioGroup
            value={props.value}
            onChange={emitted => {
              const chosen = props.options.find(o => o.value === emitted);
              if (chosen && !chosen.disabled) props.onSelect(chosen.value);
            }}
          >
            <For each={props.options}>
              {option => (
                <DropdownMenu.RadioItem
                  value={option.value}
                  class={styles.item}
                  disabled={option.disabled}
                  title={option.disabled ? option.title : undefined}
                  data-testid={
                    props.testId
                      ? `${props.testId}-option-${option.value}`
                      : undefined
                  }
                >
                  <StatusChip label={option.label} colour={option.colour} />
                  {/* The current status's mark holds its slot whether or not
                      it shows, so every chip starts on the same line. */}
                  <span class={styles.mark}>
                    <DropdownMenu.ItemIndicator class={styles.indicator}>
                      <CheckIcon />
                    </DropdownMenu.ItemIndicator>
                  </span>
                </DropdownMenu.RadioItem>
              )}
            </For>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  </Show>
);
