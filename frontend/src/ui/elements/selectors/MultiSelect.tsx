import { createMemo, createSignal, For, Show, type JSX } from 'solid-js'
import * as KCombobox from '@kobalte/core/combobox'
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../../icons'
import styles from './MultiSelect.module.css'

interface MultiSelectProps<T> {
  label: string
  items: T[]
  itemToString: (item: T) => string
  /**
   * Unique string key per item (list identity + form value). Defaults to
   * itemToString — override when labels can collide.
   */
  itemToValue?: (item: T) => string
  /** Controlled selection — the parent owns the array. */
  selectedItems: T[]
  onChange: (items: T[]) => void
  renderItem?: (item: T) => JSX.Element
  placeholder?: string
  helperText?: string
  class?: string
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
  const [inputValue, setInputValue] = createSignal('')

  const matches = (item: T, input: string) =>
    props
      .itemToString(item)
      .toLocaleLowerCase()
      .includes(input.toLocaleLowerCase())

  const noMatches = createMemo(() =>
    props.items.every(item => !matches(item, inputValue()))
  )

  return (
    <KCombobox.Root<T>
      multiple
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      options={props.items}
      optionValue={item => (props.itemToValue ?? props.itemToString)(item as T)}
      optionTextValue={item => props.itemToString(item as T)}
      optionLabel={item => props.itemToString(item as T)}
      defaultFilter={(item, input) => matches(item as T, input)}
      value={props.selectedItems}
      onChange={items => props.onChange(items)}
      onInputChange={setInputValue}
      allowsEmptyCollection
      placeholder={props.selectedItems.length === 0 ? props.placeholder : undefined}
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
      <KCombobox.Label class={styles.label}>{props.label}</KCombobox.Label>
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
      <KCombobox.Portal>
        <KCombobox.Content class={styles.content}>
          <Show when={noMatches()}>
            <div class={styles.status}>No matching items</div>
          </Show>
          <KCombobox.Listbox class={styles.listbox} />
        </KCombobox.Content>
      </KCombobox.Portal>
    </KCombobox.Root>
  )
}
