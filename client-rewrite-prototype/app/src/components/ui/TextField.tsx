import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { AlertTriangleIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import styles from './TextField.module.css';

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  /** Shown below the field when there's no error. */
  helperText?: string;
  /** Error message — presence switches the field to the error state. */
  error?: string;
  required?: boolean;
  /** Spec: 40px default, 36px small. */
  size?: 'default' | 'small';
  /** Spec max-widths: short 400px (codes/quantities), long 600px (names), full = fill. */
  width?: 'short' | 'long' | 'full';
}

/*
 * Text input — the company design spec (plain HTML <input>, no library):
 *   height 2.5rem / 2.25rem small · 0.75rem h-padding · 1px #e4e4e7 border,
 *   TMF-orange on focus · 0.375rem radius · 3px orange focus glow ·
 *   0.875rem text, 0.875rem/500 label · max-width 25rem short / 37.5rem long.
 * Everything is rem/em so it scales with the root font-size.
 */
export const TextField = ({
  label,
  helperText,
  error,
  required = false,
  size = 'default',
  width = 'short',
  id,
  className,
  ...inputProps
}: TextFieldProps) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const hasError = !!error;

  return (
    <div className={cx(styles.field, className)} data-width={width}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden>
            *
          </span>
        )}
      </label>
      <input
        id={inputId}
        className={styles.input}
        data-size={size}
        data-error={hasError}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={error || helperText ? messageId : undefined}
        {...inputProps}
      />
      {hasError ? (
        <p id={messageId} className={styles.error}>
          <AlertTriangleIcon className={styles.errorIcon} aria-hidden />
          {error}
        </p>
      ) : helperText ? (
        <p id={messageId} className={styles.helper}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
