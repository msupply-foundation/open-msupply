import { useEffect, useRef, type ChangeEvent } from 'react';
import styles from './DataTable.module.css';

/*
 * Row/select-all checkbox — a bare native <input type="checkbox">. Owning the
 * simple: the platform gives full keyboard + screen-reader semantics for free;
 * we only theme it (accent-color = brand orange) and set `indeterminate` (which
 * has no HTML attribute) via a ref. No widget library needed.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.checkbox}
      checked={checked}
      onChange={onChange}
      aria-label={label}
      // Don't let a checkbox click also trigger the row's activate handler.
      onClick={e => e.stopPropagation()}
    />
  );
}
