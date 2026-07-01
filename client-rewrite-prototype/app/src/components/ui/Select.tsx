import { useId } from 'react';
import type { ReactNode } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDownIcon, CheckIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading adornment (icon, or a coloured status dot). */
  adornment?: ReactNode;
  /** Optional muted second line under the label. */
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

/*
 * Styled drop-down — Radix Select (headless). Same job as <NativeSelect> (pick
 * one from a fixed list) but for when the closed control and the options need
 * RICH content the native <select> can't render: a status colour-dot, an icon,
 * a two-line option. A native <option> only holds a text string, so the moment
 * design wants adornments you're forced off it — and hand-rolling the
 * replacement means re-implementing the exact thing WCAG 2.2 grades: a
 * role="listbox" popup with `aria-activedescendant`, full type-ahead, arrow /
 * Home / End / PageUp-Down keys, typeahead, focus return, and RTL-aware
 * placement. Radix gives all of that; we own 100% of the markup + CSS. It reads
 * direction from the app-wide DirectionProvider (see LocaleProvider), so it
 * flips with the rest of the UI.
 */
export const Select = ({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  helperText,
  disabled,
  className,
}: SelectProps) => {
  const autoId = useId();
  const helperId = `${autoId}-helper`;

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} htmlFor={autoId}>
        {label}
      </label>
      <RadixSelect.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          id={autoId}
          className={styles.trigger}
          aria-describedby={helperText ? helperId : undefined}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon className={styles.triggerIcon}>
            <ChevronDownIcon />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className={styles.content}
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className={styles.viewport}>
              {options.map(option => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={styles.item}
                >
                  {option.adornment && (
                    <span className={styles.adornment}>{option.adornment}</span>
                  )}
                  <span className={styles.itemBody}>
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    {option.description && (
                      <span className={styles.itemDescription}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  <RadixSelect.ItemIndicator className={styles.itemIndicator}>
                    <CheckIcon />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {helperText && (
        <p id={helperId} className={styles.helper}>
          {helperText}
        </p>
      )}
    </div>
  );
};
