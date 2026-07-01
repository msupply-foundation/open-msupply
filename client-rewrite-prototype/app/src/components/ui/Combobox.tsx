import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useCombobox } from 'downshift';
import { SearchIcon, CloseIcon, ChevronDownIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import styles from './Combobox.module.css';

interface ComboboxProps<T> {
  label: string;
  /** The full option set; filtered locally as the user types. */
  items: T[];
  /** The plain-text label of an item — used for the input, filtering and a11y. */
  itemToString: (item: T | null) => string;
  onChange?: (item: T | null) => void;
  /** Rich per-option rendering; defaults to the plain itemToString label. */
  renderItem?: (item: T) => ReactNode;
  /** Override the default locale-aware substring filter. */
  filter?: (items: T[], input: string) => T[];
  placeholder?: string;
  helperText?: string;
  loading?: boolean;
  className?: string;
}

/*
 * Autocomplete / combobox — Downshift `useCombobox` (headless). THE widget
 * Decision #3 says to buy rather than build: a text input wired to a filtered
 * listbox. It's the one selector that's genuinely dangerous to hand-roll — the
 * WAI-ARIA combobox pattern is `aria-activedescendant` virtual focus (the input
 * keeps DOM focus while a *separate* option is "active"), result-count / active
 * announcements for screen readers, and typeahead + arrow / Enter / Escape
 * semantics. It's easy to ship something that looks right and silently fails the
 * 10% that matters. Downshift (~3 KB) supplies exactly that contract and nothing
 * else — no markup, no styles, no filter policy — so we still own the look and
 * provide the (locale-aware) filter.
 *
 * The popup here is a plain absolutely-positioned list (not portaled), which
 * keeps it simple and RTL-correct via logical properties. For very long lists
 * this is where TanStack Virtual slots in (render only the visible slice); for
 * collision-aware placement it could be moved into a Radix Popover. Both are
 * deferred — see DECISIONS.md / the Selectors entry.
 */
export const Combobox = <T,>({
  label,
  items,
  itemToString,
  onChange,
  renderItem,
  filter,
  placeholder,
  helperText,
  loading = false,
  className,
}: ComboboxProps<T>) => {
  const [inputValue, setInputValue] = useState('');

  const filtered = useMemo(() => {
    if (!inputValue) return items;
    if (filter) return filter(items, inputValue);
    const needle = inputValue.toLocaleLowerCase();
    return items.filter(item =>
      itemToString(item).toLocaleLowerCase().includes(needle)
    );
  }, [items, inputValue, filter, itemToString]);

  const {
    isOpen,
    getLabelProps,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
    selectedItem,
    reset,
  } = useCombobox<T>({
    items: filtered,
    itemToString,
    onInputValueChange: ({ inputValue }) => setInputValue(inputValue ?? ''),
    onSelectedItemChange: ({ selectedItem }) => onChange?.(selectedItem ?? null),
  });

  const showClear = !!selectedItem || inputValue.length > 0;

  const clear = () => {
    reset();
    setInputValue('');
    onChange?.(null);
  };

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} {...getLabelProps()}>
        {label}
      </label>

      <div className={styles.control}>
        <span className={styles.searchIcon} aria-hidden>
          <SearchIcon />
        </span>
        <input
          className={styles.input}
          placeholder={placeholder}
          {...getInputProps()}
        />
        {showClear && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear selection"
            onClick={clear}
          >
            <CloseIcon />
          </button>
        )}
        <button
          type="button"
          className={styles.toggle}
          aria-label="Toggle options"
          {...getToggleButtonProps()}
        >
          <ChevronDownIcon
            className={cx(styles.toggleIcon, isOpen && styles.toggleIconOpen)}
          />
        </button>
      </div>

      <div className={styles.menuWrap}>
        <ul
          className={cx(styles.menu, isOpen && styles.menuOpen)}
          {...getMenuProps()}
        >
          {isOpen && loading && <li className={styles.status}>Loading…</li>}
          {isOpen && !loading && filtered.length === 0 && (
            <li className={styles.status}>No matching items</li>
          )}
          {isOpen &&
            !loading &&
            filtered.map((item, index) => (
              <li
                key={index}
                className={cx(
                  styles.item,
                  highlightedIndex === index && styles.itemHighlighted,
                  selectedItem === item && styles.itemSelected
                )}
                {...getItemProps({ item, index })}
              >
                {renderItem ? renderItem(item) : itemToString(item)}
              </li>
            ))}
        </ul>
      </div>

      {helperText && <p className={styles.helper}>{helperText}</p>}
    </div>
  );
};
