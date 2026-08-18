import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import * as KCombobox from '@kobalte/core/combobox';
import { t } from '../../../intl';
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../../icons';
import { usePortalMount } from '../../utils/portalMount';
import { keepPopupOpenOnInsideContent } from './dismissInsideGuard';
import styles from './MultiSelect.module.css';

interface MultiSelectProps<T> {
  label: string;
  items: T[];
  itemToString: (item: T) => string;
  /**
   * Unique string key per item (list identity + form value). Defaults to
   * itemToString — override when labels can collide.
   */
  itemToValue?: (item: T) => string;
  /** Controlled selection — the parent owns the array. */
  selectedItems: T[];
  onChange: (items: T[]) => void;
  renderItem?: (item: T) => JSX.Element;
  placeholder?: string;
  helperText?: string;
  /**
   * Control size. 'default' is the form-field size; 'small' is the compact
   * variant for dense contexts (e.g. cards). Matches the shared input size
   * scale (see --input-height*).
   */
  size?: 'default' | 'small';
  /**
   * Max-width CAP — opt-in, TextField's vocabulary and TextField's default:
   * `full` (fill the container). `compact` (10rem) narrows only the control
   * box; `short` (25rem) / `long` (37.5rem) cap the whole field.
   */
  width?: 'compact' | 'short' | 'long' | 'full';
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the field. Kept outside the label element so it
   * isn't part of the control's accessible name. As TextField.
   */
  labelInfo?: JSX.Element;
  class?: string;
}

/*
 * Multi-select autocomplete — Kobalte Combobox with `multiple`. The many-value
 * sibling of <Combobox>: type to filter, pick several, each shows as a
 * removable tag; Backspace in the empty input removes the last tag and the
 * menu stays open so several can be added in a row (both Kobalte defaults).
 * The selection stays controlled (parent owns the array) and we own all
 * markup + CSS — the tags render inside Kobalte's Control via its
 * selection-state render prop.
 *
 * One deliberate difference from the prototype's Downshift version: picked
 * items STAY in the list, check-marked, and clicking one deselects it — that's
 * Kobalte's (standard WAI-ARIA) multi-combobox model, and removing them from
 * `options` would break its value→option resolution. The prototype dropped
 * picked items from the list instead.
 */
export const MultiSelect = <T,>(props: MultiSelectProps<T>) => {
  const [inputValue, setInputValue] = createSignal('');
  // Inside a Dialog, mount the listbox into the dialog element (top layer +
  // non-inert); outside one this is undefined and Kobalte's default <body>
  // portal is used. As <Combobox> — without it the popup renders BEHIND a
  // top-layer <dialog> and is inert.
  const portalMount = usePortalMount();
  let contentEl: HTMLElement | undefined;

  const matches = (item: T, input: string) =>
    props
      .itemToString(item)
      .toLocaleLowerCase()
      .includes(input.toLocaleLowerCase());

  const noMatches = createMemo(() =>
    props.items.every(item => !matches(item, inputValue()))
  );

  // Two reasons the listbox can be empty, and they must not read alike. A
  // search that matched nothing is answerable by typing something else; a list
  // with NO options was never populated, so search-shaped copy states the wrong
  // fact (as Combobox's emptyQueryMessage/noResultsMessage split). `every` is
  // vacuously true on an empty array, so one status row covers both — only the
  // copy differs.
  const emptyMessage = () =>
    props.items.length === 0
      ? t('label.no-options')
      : t('control.search.no-results-label');

  return (
    <KCombobox.Root<T>
      multiple
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      data-width={props.width ?? 'full'}
      data-size={props.size ?? 'default'}
      options={props.items}
      optionValue={item => (props.itemToValue ?? props.itemToString)(item as T)}
      optionTextValue={item => props.itemToString(item as T)}
      optionLabel={item => props.itemToString(item as T)}
      defaultFilter={(item, input) => matches(item as T, input)}
      value={props.selectedItems}
      onChange={items => props.onChange(items)}
      onInputChange={setInputValue}
      allowsEmptyCollection
      // Open the listbox as soon as the field is focused/clicked, as <Combobox>
      // does. Kobalte's DEFAULT is triggerMode="input" — the popup opens only
      // once the user TYPES — so clicking the field did nothing at all and the
      // chevron was the only way in by pointer. Two sibling pickers that look
      // identical must not answer a click differently.
      triggerMode="focus"
      placeholder={
        props.selectedItems.length === 0 ? props.placeholder : undefined
      }
      itemComponent={itemProps => (
        <KCombobox.Item item={itemProps.item} class={styles.item}>
          <span class={styles.itemBody}>
            {props.renderItem
              ? props.renderItem(itemProps.item.rawValue)
              : props.itemToString(itemProps.item.rawValue)}
          </span>
          <KCombobox.ItemIndicator class={styles.itemIndicator}>
            <CheckIcon />
          </KCombobox.ItemIndicator>
        </KCombobox.Item>
      )}
    >
      <Show
        when={props.labelInfo}
        fallback={
          <KCombobox.Label class={styles.label}>{props.label}</KCombobox.Label>
        }
      >
        {/* labelInfo sits OUTSIDE the label element, as a sibling: nested in it
            its accessible name would leak into the input's (the
            name-from-label computation concatenates descendant controls). */}
        <span class={styles.labelRow}>
          <KCombobox.Label class={styles.label}>{props.label}</KCombobox.Label>
          {props.labelInfo}
        </span>
      </Show>
      <KCombobox.Control<T> class={styles.control}>
        {state => (
          <>
            <div class={styles.tags}>
              <For each={state.selectedOptions()}>
                {item => (
                  <span class={styles.tag}>
                    <span class={styles.tagLabel}>
                      {props.itemToString(item)}
                    </span>
                    <button
                      type="button"
                      class={styles.tagRemove}
                      aria-label={`Remove ${props.itemToString(item)}`}
                      onClick={() => state.remove(item)}
                    >
                      <CloseIcon />
                    </button>
                  </span>
                )}
              </For>
              <KCombobox.Input class={styles.input} />
            </div>
            <KCombobox.Trigger
              class={styles.toggle}
              aria-label="Toggle options"
            >
              <KCombobox.Icon class={styles.toggleIcon}>
                <ChevronDownIcon />
              </KCombobox.Icon>
            </KCombobox.Trigger>
          </>
        )}
      </KCombobox.Control>
      <Show when={props.helperText}>
        <KCombobox.Description class={styles.helper}>
          {props.helperText}
        </KCombobox.Description>
      </Show>
      <KCombobox.Portal mount={portalMount?.()}>
        <KCombobox.Content
          ref={contentEl}
          class={styles.content}
          // Keep the popup open when a pointerdown lands inside its own content
          // — as <Combobox>. Without it, an option click inside a Dialog is
          // read as a click-outside and dismisses before the pick commits (see
          // dismissInsideGuard).
          onInteractOutside={keepPopupOpenOnInsideContent(() => contentEl)}
        >
          <Show when={noMatches()}>
            <div class={styles.status}>{emptyMessage()}</div>
          </Show>
          <KCombobox.Listbox class={styles.listbox} />
        </KCombobox.Content>
      </KCombobox.Portal>
    </KCombobox.Root>
  );
};
