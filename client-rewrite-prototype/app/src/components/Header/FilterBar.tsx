import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
  CheckIcon,
} from '@/components/icons';
import { cx } from '@/utils/classNames';
import menu from '@/components/ui/Menu.module.css';
import styles from './FilterBar.module.css';

/*
 * Filter bar — mirrors the current app's FilterMenu: a "Filters" dropdown lists
 * available fields; picking one adds an inline editor beside it. The only
 * headless dependency is Radix DropdownMenu (already loaded): it powers the
 * Filters menu AND the Status multi-select (via CheckboxItem). Text inputs are
 * plain HTML. Date-range filters are deferred to the date-picker element.
 */

type FieldKey = 'otherPartyName' | 'invoiceNumber' | 'theirReference' | 'status';

interface Field {
  key: FieldKey;
  name: string;
  type: 'text' | 'enum';
  placeholder?: string;
}

const FIELDS: Field[] = [
  { key: 'otherPartyName', name: 'Name', type: 'text', placeholder: 'Search by name' },
  { key: 'invoiceNumber', name: 'Invoice number', type: 'text' },
  { key: 'theirReference', name: 'Reference', type: 'text' },
  { key: 'status', name: 'Status', type: 'enum' },
];

const STATUS_OPTIONS = [
  'New',
  'Allocated',
  'Picked',
  'Shipped',
  'Delivered',
  'Verified',
];

export const FilterBar = () => {
  const [active, setActive] = useState<FieldKey[]>([]);
  const [text, setText] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<string[]>([]);

  const available = FIELDS.filter(f => !active.includes(f.key));

  const addFilter = (key: FieldKey) => setActive(prev => [...prev, key]);

  const removeFilter = (key: FieldKey) => {
    setActive(prev => prev.filter(k => k !== key));
    if (key === 'status') setStatuses([]);
    else setText(prev => ({ ...prev, [key]: '' }));
  };

  const resetAll = () => {
    setActive([]);
    setText({});
    setStatuses([]);
  };

  return (
    <div className={styles.bar}>
      <FiltersMenu
        available={available}
        onAdd={addFilter}
        onReset={active.length > 0 ? resetAll : undefined}
      />

      {active.map(key => {
        const field = FIELDS.find(f => f.key === key)!;
        if (field.type === 'text') {
          return (
            <TextFilter
              key={key}
              field={field}
              value={text[key] ?? ''}
              onChange={v => setText(prev => ({ ...prev, [key]: v }))}
              onRemove={() => removeFilter(key)}
            />
          );
        }
        return (
          <StatusFilter
            key={key}
            selected={statuses}
            onToggle={value =>
              setStatuses(prev =>
                prev.includes(value)
                  ? prev.filter(s => s !== value)
                  : [...prev, value]
              )
            }
            onRemove={() => removeFilter('status')}
          />
        );
      })}
    </div>
  );
};

const FiltersMenu = ({
  available,
  onAdd,
  onReset,
}: {
  available: Field[];
  onAdd: (key: FieldKey) => void;
  onReset?: () => void;
}) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button type="button" className={styles.trigger}>
        <span>Filters</span>
        <ChevronDownIcon className={styles.triggerChevron} />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className={menu.content} align="start" sideOffset={4}>
        {available.map(field => (
          <DropdownMenu.Item
            key={field.key}
            className={menu.item}
            onSelect={() => onAdd(field.key)}
          >
            <span className={menu.label}>{field.name}</span>
          </DropdownMenu.Item>
        ))}
        {onReset && <DropdownMenu.Separator className={menu.separator} />}
        {onReset && (
          <DropdownMenu.Item className={menu.item} onSelect={onReset}>
            <span className={menu.label}>Remove all filters</span>
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

const TextFilter = ({
  field,
  value,
  onChange,
  onRemove,
}: {
  field: Field;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) => (
  <label className={styles.textFilter}>
    <span className={styles.textFilterIcon}>
      <SearchIcon />
    </span>
    <input
      className={styles.input}
      type="text"
      value={value}
      placeholder={field.placeholder ?? field.name}
      aria-label={field.name}
      onChange={e => onChange(e.target.value)}
    />
    <button
      type="button"
      className={styles.remove}
      aria-label={`Remove ${field.name} filter`}
      onClick={onRemove}
    >
      <CloseIcon />
    </button>
  </label>
);

const StatusFilter = ({
  selected,
  onToggle,
  onRemove,
}: {
  selected: string[];
  onToggle: (value: string) => void;
  onRemove: () => void;
}) => (
  <div className={styles.enumFilter}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.enumTrigger}>
          <span>
            Status
            {selected.length > 0 && (
              <span className={styles.count}>{selected.length}</span>
            )}
          </span>
          <ChevronDownIcon className={styles.triggerChevron} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={menu.content}
          align="start"
          sideOffset={4}
        >
          {STATUS_OPTIONS.map(option => (
            <DropdownMenu.CheckboxItem
              key={option}
              className={cx(menu.item, menu.checkboxItem)}
              checked={selected.includes(option)}
              onCheckedChange={() => onToggle(option)}
              onSelect={e => e.preventDefault()}
            >
              <span className={menu.checkbox}>
                <DropdownMenu.ItemIndicator className={menu.indicator}>
                  <CheckIcon />
                </DropdownMenu.ItemIndicator>
              </span>
              <span className={menu.label}>{option}</span>
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    <button
      type="button"
      className={styles.remove}
      aria-label="Remove Status filter"
      onClick={onRemove}
    >
      <CloseIcon />
    </button>
  </div>
);
