import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import styles from './NativeSelect.module.css';

export interface NativeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface NativeSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  options: NativeOption[];
  /** Shown as a disabled first option when there's no value yet. */
  placeholder?: string;
  helperText?: string;
}

/*
 * Plain drop-down — a bare native <select>, no component library. This is the
 * "own the simple" end of the spectrum: for a short, fixed enum with no search
 * and no rich options, the browser already gives us everything WCAG grades —
 * full keyboard support, type-ahead, and (crucially on the target tablets) the
 * OS-native picker wheel — for zero JS and zero bundle. We only add a label, a
 * chevron (the native arrow can't be styled) and the token styling; the popup
 * itself is the platform's, so nothing to theme, trap, or position.
 */
export const NativeSelect = ({
  label,
  options,
  placeholder,
  helperText,
  id,
  className,
  defaultValue,
  value,
  ...selectProps
}: NativeSelectProps) => {
  const autoId = useId();
  const selectId = id ?? autoId;
  const helperId = `${selectId}-helper`;
  // With a placeholder and no chosen value, start on the empty prompt.
  const isControlled = value !== undefined;
  const emptyDefault =
    !isControlled && defaultValue === undefined && placeholder
      ? ''
      : defaultValue;

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <div className={styles.control}>
        <select
          id={selectId}
          className={styles.select}
          aria-describedby={helperText ? helperId : undefined}
          defaultValue={emptyDefault}
          value={value}
          {...selectProps}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className={styles.chevron} aria-hidden />
      </div>
      {helperText && (
        <p id={helperId} className={styles.helper}>
          {helperText}
        </p>
      )}
    </div>
  );
};
