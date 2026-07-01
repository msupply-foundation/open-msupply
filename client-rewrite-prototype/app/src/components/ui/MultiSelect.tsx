import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useCombobox, useMultipleSelection } from 'downshift';
import { CloseIcon, ChevronDownIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import styles from './MultiSelect.module.css';

interface MultiSelectProps<T> {
  label: string;
  items: T[];
  itemToString: (item: T) => string;
  /** Controlled selection — the parent owns the array. */
  selectedItems: T[];
  onChange: (items: T[]) => void;
  renderItem?: (item: T) => ReactNode;
  placeholder?: string;
  helperText?: string;
  className?: string;
}

/*
 * Multi-select autocomplete — Downshift `useMultipleSelection` + `useCombobox`.
 * The many-value sibling of <Combobox>: type to filter, pick several, each shows
 * as a removable tag. Multi-select layers extra a11y on top of the combobox
 * contract — the tags are a focusable, arrow-navigable group, Backspace removes
 * the last one, and removals must be announced — which is exactly the machinery
 * `useMultipleSelection` coordinates with the combobox. We keep the selection
 * controlled (parent owns the array) and own all markup + CSS; already-selected
 * items are filtered out of the list.
 */
export const MultiSelect = <T,>({
  label,
  items,
  itemToString,
  selectedItems,
  onChange,
  renderItem,
  placeholder,
  helperText,
  className,
}: MultiSelectProps<T>) => {
  const [inputValue, setInputValue] = useState('');

  const filtered = useMemo(() => {
    const needle = inputValue.toLocaleLowerCase();
    return items.filter(
      item =>
        !selectedItems.includes(item) &&
        itemToString(item).toLocaleLowerCase().includes(needle)
    );
  }, [items, selectedItems, inputValue, itemToString]);

  const { getSelectedItemProps, getDropdownProps, removeSelectedItem } =
    useMultipleSelection<T>({
      selectedItems,
      onStateChange({ selectedItems: next, type }) {
        switch (type) {
          case useMultipleSelection.stateChangeTypes
            .SelectedItemKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
          case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
            onChange(next ?? []);
            break;
          default:
            break;
        }
      },
    });

  const {
    isOpen,
    getLabelProps,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox<T>({
    items: filtered,
    itemToString: item => (item ? itemToString(item) : ''),
    inputValue,
    // Keep the input clearing after each pick rather than adopting a value.
    selectedItem: null,
    stateReducer(_state, { changes, type }) {
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          // Stay open after selecting so several can be added in a row.
          return { ...changes, isOpen: true, highlightedIndex: 0 };
        default:
          return changes;
      }
    },
    onStateChange({ inputValue: nextInput, type, selectedItem }) {
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          if (selectedItem) {
            onChange([...selectedItems, selectedItem]);
            setInputValue('');
          }
          break;
        case useCombobox.stateChangeTypes.InputChange:
          setInputValue(nextInput ?? '');
          break;
        default:
          break;
      }
    },
  });

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} {...getLabelProps()}>
        {label}
      </label>

      <div className={styles.control}>
        <div className={styles.tags}>
          {selectedItems.map((item, index) => (
            <span
              key={index}
              className={styles.tag}
              {...getSelectedItemProps({ selectedItem: item, index })}
            >
              <span className={styles.tagLabel}>{itemToString(item)}</span>
              <button
                type="button"
                className={styles.tagRemove}
                aria-label={`Remove ${itemToString(item)}`}
                onClick={e => {
                  e.stopPropagation();
                  removeSelectedItem(item);
                }}
              >
                <CloseIcon />
              </button>
            </span>
          ))}
          <input
            className={styles.input}
            placeholder={selectedItems.length === 0 ? placeholder : undefined}
            {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
          />
        </div>
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
          {isOpen && filtered.length === 0 && (
            <li className={styles.status}>No more items</li>
          )}
          {isOpen &&
            filtered.map((item, index) => (
              <li
                key={index}
                className={cx(
                  styles.item,
                  highlightedIndex === index && styles.itemHighlighted
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
