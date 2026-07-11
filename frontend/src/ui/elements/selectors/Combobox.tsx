import { createEffect, createMemo, createSignal, on, Show, type JSX } from 'solid-js'
import * as KCombobox from '@kobalte/core/combobox'
import { AlertTriangleIcon, ChevronDownIcon, CloseIcon, SearchIcon } from '../../icons'
import { usePortalMount } from '../../utils/portalMount'
import { keepDialogOpenOnInside } from './dismissInsideGuard'
import styles from './Combobox.module.css'

interface ComboboxProps<T> {
  label: string
  /** The full option set; filtered locally as the user types. */
  items: T[]
  /** The plain-text label of an item — used for the input, filtering and a11y. */
  itemToString: (item: T) => string
  /**
   * Unique string key per item (list identity + form value). Defaults to
   * itemToString — override when labels can collide.
   */
  itemToValue?: (item: T) => string
  /**
   * Controlled selection: the itemToValue key of the currently-selected item (or undefined for
   * none). Pass it to keep the input in sync with external state — e.g. an editable cell showing
   * a line's saved location. Omit for an uncontrolled combobox (the create/filter forms), where
   * the selection lives only in the widget and is reported via onChange.
   */
  value?: string
  onChange?: (item: T | null) => void
  /** Rich per-option rendering; defaults to the plain itemToString label. */
  renderItem?: (item: T) => JSX.Element
  /**
   * Override the default locale-aware substring filter. Per-item predicate
   * (Kobalte's model), unlike the prototype's whole-list filter.
   */
  filter?: (item: T, input: string) => boolean
  placeholder?: string
  helperText?: string
  /** Error message — presence switches the control to the error state (red border/glow +
   *  aria-invalid), shown with an alert icon below the field. Mirrors TextField's `error`. */
  error?: string
  loading?: boolean
  disabled?: boolean
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow that shows it. */
  hideLabel?: boolean
  class?: string
}

/*
 * Autocomplete / combobox — Kobalte Combobox (headless). THE widget principle
 * #2 says to buy rather than build: a text input wired to a filtered listbox.
 * It's the one selector that's genuinely dangerous to hand-roll — the WAI-ARIA
 * combobox pattern is `aria-activedescendant` virtual focus (the input keeps
 * DOM focus while a *separate* option is "active"), result announcements for
 * screen readers, and typeahead + arrow / Enter / Escape semantics. Kobalte's
 * Combobox is the Solid analogue of the prototype's Downshift pick, and buys a
 * couple of things Downshift left to us: the popup is portaled with
 * collision-aware, trigger-width placement (the prototype deferred that to "a
 * Radix Popover later"), and filtering is built in (we pass the predicate).
 * We still own all markup + CSS.
 *
 * Clearing: the clear button clears a committed selection; stray typed text is
 * already handled by Kobalte itself (Escape clears it, blur reverts it).
 */
export const Combobox = <T,>(props: ComboboxProps<T>) => {
  const [selected, setSelected] = createSignal<T | null>(null)
  const [inputValue, setInputValue] = createSignal('')
  let inputEl: HTMLInputElement | undefined

  const keyOf = (item: T) => (props.itemToValue ?? props.itemToString)(item)

  // Controlled selection: when `value` is provided, keep the internal `selected` item in sync with
  // it (resolve the key against the current items). Skipped entirely when `value` is undefined —
  // the widget then stays uncontrolled (create/filter forms). Guarded by `on(value, ...)` so it
  // only reacts to the prop, not to the user's own selection.
  createEffect(
    on(
      () => props.value,
      value => {
        if (value === undefined) return
        const match = props.items.find(item => keyOf(item) === value) ?? null
        if (match !== selected()) setSelected(() => match)
      },
    ),
  )
  // Inside a Dialog, mount the listbox into the dialog element (top layer + non-inert);
  // outside one this is undefined and Kobalte's default <body> portal is used.
  const portalMount = usePortalMount()

  const matches = (item: T, input: string) =>
    props.filter
      ? props.filter(item, input)
      : props
          .itemToString(item)
          .toLocaleLowerCase()
          .includes(input.toLocaleLowerCase())

  const noMatches = createMemo(() =>
    props.items.every(item => !matches(item, inputValue()))
  )

  const handleChange = (item: T | null) => {
    setSelected(() => item)
    props.onChange?.(item)
  }

  return (
    <KCombobox.Root<T>
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      options={props.loading ? [] : props.items}
      optionValue={item => (props.itemToValue ?? props.itemToString)(item as T)}
      optionTextValue={item => props.itemToString(item as T)}
      optionLabel={item => props.itemToString(item as T)}
      defaultFilter={(item, input) => matches(item as T, input)}
      value={selected()}
      onChange={handleChange}
      onInputChange={setInputValue}
      allowsEmptyCollection
      disabled={props.disabled}
      placeholder={props.placeholder}
      itemComponent={itemProps => (
        <KCombobox.Item item={itemProps.item} class={styles.item}>
          {props.renderItem
            ? props.renderItem(itemProps.item.rawValue)
            : props.itemToString(itemProps.item.rawValue)}
        </KCombobox.Item>
      )}
    >
      {/* hideLabel keeps the label for a11y (aria-labelledby) but visually hidden — used
          when a FieldRow already shows the label beside the control. */}
      <KCombobox.Label class={props.hideLabel ? styles.labelHidden : styles.label}>
        {props.label}
      </KCombobox.Label>
      <KCombobox.Control class={styles.control} data-error={props.error ? '' : undefined}>
        <span class={styles.searchIcon} aria-hidden="true">
          <SearchIcon />
        </span>
        <KCombobox.Input
          ref={inputEl}
          class={styles.input}
          aria-invalid={props.error ? 'true' : undefined}
        />
        <Show when={selected() !== null}>
          <button
            type="button"
            class={styles.clear}
            aria-label="Clear selection"
            onClick={() => {
              handleChange(null)
              inputEl?.focus()
            }}
          >
            <CloseIcon />
          </button>
        </Show>
        <KCombobox.Trigger class={styles.toggle} aria-label="Toggle options">
          <KCombobox.Icon class={styles.toggleIcon}>
            <ChevronDownIcon />
          </KCombobox.Icon>
        </KCombobox.Trigger>
      </KCombobox.Control>
      {/* Error message (with an alert icon) takes precedence over helperText — mirrors
          TextField. Nothing is conveyed by colour alone (icon + text). */}
      <Show
        when={props.error}
        fallback={
          <Show when={props.helperText}>
            <KCombobox.Description class={styles.helper}>
              {props.helperText}
            </KCombobox.Description>
          </Show>
        }
      >
        <KCombobox.Description class={styles.error}>
          <AlertTriangleIcon class={styles.errorIcon} />
          {props.error}
        </KCombobox.Description>
      </Show>
      <KCombobox.Portal mount={portalMount?.()}>
        <KCombobox.Content
          class={styles.content}
          // Keep the listbox open when a pointerdown lands inside the dialog it's mounted in
          // — Kobalte otherwise dismisses it before a mouse click commits (see
          // dismissInsideGuard). A genuine click outside the dialog still closes it.
          onInteractOutside={keepDialogOpenOnInside(portalMount?.())}
        >
          <Show when={props.loading}>
            <div class={styles.status}>Loading…</div>
          </Show>
          <Show when={!props.loading && noMatches()}>
            <div class={styles.status}>No matching items</div>
          </Show>
          <KCombobox.Listbox class={styles.listbox} />
        </KCombobox.Content>
      </KCombobox.Portal>
    </KCombobox.Root>
  )
}
