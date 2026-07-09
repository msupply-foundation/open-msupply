import { createSignal, For, Show } from 'solid-js'
import * as DropdownMenu from '@kobalte/core/dropdown-menu'
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from '../../icons'
import styles from './FilterBar.module.css'

export interface FilterOption {
  value: string
  label: string
}

interface FilterFieldBase {
  /** Property name in `values` — a column id / future URL query-param name. */
  key: string
  /** Shown in the Filters menu, on the chip, and in accessible names. */
  name: string
}

export interface TextFilterField extends FilterFieldBase {
  type: 'text'
  placeholder?: string
}

export interface EnumFilterField extends FilterFieldBase {
  type: 'enum'
  options: FilterOption[]
}

export type FilterField = TextFilterField | EnumFilterField

/**
 * Text fields map to a string, enum fields to the array of checked values.
 * An empty filter (cleared text, nothing ticked) is ABSENT from the object —
 * a key being present means that filter is live.
 */
export type FilterValues = Record<string, string | string[]>

interface FilterBarProps {
  /** The fields a user can filter by — drives the Filters menu and the chips. */
  fields: FilterField[]
  /** Controlled filter values — the parent owns the object. */
  values: FilterValues
  onChange: (values: FilterValues) => void
}

/*
 * Filter bar — the current app's FilterMenu pattern (Solid port of the RnD
 * prototype's FilterBar, Radix DropdownMenu → Kobalte): a "Filters" dropdown
 * lists the available fields; picking one adds an inline editor chip beside
 * it — a text input, or a multi-check menu for enum fields — each with a
 * round remove button, plus "Remove all filters" in the menu once any chip
 * is up.
 *
 * State model (see DECISIONS.md 2026-07-08): filter VALUES are a controlled
 * prop — the parent owns the object (a table consumes it today; a router
 * holds it in URL params once routing lands, which is where the prototype
 * kept it). Which chips are *shown* is presentation state — a chip can be
 * visible with no value yet — so it stays local, seeded from `values` so a
 * restored state opens with its chips visible.
 */
export const FilterBar = (props: FilterBarProps) => {
  const [active, setActive] = createSignal<string[]>(
    props.fields.filter(f => props.values[f.key] !== undefined).map(f => f.key),
  )

  const available = () => props.fields.filter(f => !active().includes(f.key))

  const addFilter = (key: string) => setActive(prev => [...prev, key])

  const setValue = (key: string, value: string | string[] | undefined) => {
    const next = { ...props.values }
    if (value === undefined || value.length === 0) delete next[key]
    else next[key] = value
    props.onChange(next)
  }

  const removeFilter = (key: string) => {
    setActive(prev => prev.filter(k => k !== key))
    setValue(key, undefined)
  }

  const resetAll = () => {
    setActive([])
    props.onChange({})
  }

  const toggleEnumValue = (key: string, value: string) => {
    const selected = (props.values[key] as string[] | undefined) ?? []
    setValue(
      key,
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value],
    )
  }

  return (
    <div class={styles.bar}>
      <FiltersMenu
        available={available()}
        onAdd={addFilter}
        onReset={active().length > 0 ? resetAll : undefined}
      />

      <For each={active()}>
        {key => {
          const field = props.fields.find(f => f.key === key)
          if (!field) return null
          return field.type === 'text' ? (
            <TextFilter
              field={field}
              value={(props.values[key] as string | undefined) ?? ''}
              onInput={text => setValue(key, text)}
              onRemove={() => removeFilter(key)}
            />
          ) : (
            <EnumFilter
              field={field}
              selected={(props.values[key] as string[] | undefined) ?? []}
              onToggle={value => toggleEnumValue(key, value)}
              onRemove={() => removeFilter(key)}
            />
          )
        }}
      </For>
    </div>
  )
}

const FiltersMenu = (props: {
  available: FilterField[]
  onAdd: (key: string) => void
  onReset?: () => void
}) => (
  <DropdownMenu.Root placement="bottom-start" gutter={4}>
    <DropdownMenu.Trigger class={styles.trigger}>
      <span>Filters</span>
      <ChevronDownIcon class={styles.triggerChevron} />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={styles.content}>
        <For each={props.available}>
          {field => (
            <DropdownMenu.Item
              class={styles.item}
              onSelect={() => props.onAdd(field.key)}
            >
              <span class={styles.itemLabel}>{field.name}</span>
            </DropdownMenu.Item>
          )}
        </For>
        <Show when={props.onReset && props.available.length > 0}>
          <DropdownMenu.Separator class={styles.separator} />
        </Show>
        <Show when={props.onReset}>
          <DropdownMenu.Item class={styles.item} onSelect={() => props.onReset?.()}>
            <span class={styles.itemLabel}>Remove all filters</span>
          </DropdownMenu.Item>
        </Show>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
)

const TextFilter = (props: {
  field: TextFilterField
  value: string
  onInput: (value: string) => void
  onRemove: () => void
}) => (
  <label class={styles.textFilter}>
    <span class={styles.textFilterIcon}>
      <SearchIcon />
    </span>
    <input
      class={styles.input}
      type="text"
      value={props.value}
      placeholder={props.field.placeholder ?? props.field.name}
      aria-label={props.field.name}
      onInput={e => props.onInput(e.currentTarget.value)}
    />
    <button
      type="button"
      class={styles.remove}
      aria-label={`Remove ${props.field.name} filter`}
      onClick={props.onRemove}
    >
      <CloseIcon />
    </button>
  </label>
)

const EnumFilter = (props: {
  field: EnumFilterField
  selected: string[]
  onToggle: (value: string) => void
  onRemove: () => void
}) => (
  <div class={styles.enumFilter}>
    <DropdownMenu.Root placement="bottom-start" gutter={4}>
      <DropdownMenu.Trigger class={styles.enumTrigger}>
        <span>
          {props.field.name}
          <Show when={props.selected.length > 0}>
            <span class={styles.count}>{props.selected.length}</span>
          </Show>
        </span>
        <ChevronDownIcon class={styles.triggerChevron} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class={styles.content}>
          <For each={props.field.options}>
            {option => (
              <DropdownMenu.CheckboxItem
                class={`${styles.item} ${styles.checkboxItem}`}
                checked={props.selected.includes(option.value)}
                onChange={() => props.onToggle(option.value)}
                closeOnSelect={false}
              >
                <span class={styles.checkbox}>
                  <DropdownMenu.ItemIndicator class={styles.indicator}>
                    <CheckIcon />
                  </DropdownMenu.ItemIndicator>
                </span>
                <span class={styles.itemLabel}>{option.label}</span>
              </DropdownMenu.CheckboxItem>
            )}
          </For>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    <button
      type="button"
      class={styles.remove}
      aria-label={`Remove ${props.field.name} filter`}
      onClick={props.onRemove}
    >
      <CloseIcon />
    </button>
  </div>
)
