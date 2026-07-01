import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { DownloadIcon, ChevronDownIcon } from '@/components/icons';
import { useRipple } from '@/components/ui/useRipple';
import menu from '@/components/ui/Menu.module.css';
import styles from './ExportButton.module.css';

type ExportFormat = 'csv' | 'excel';

const OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
];

/*
 * Split button — a primary action glued to a dropdown caret. There's no "split
 * button" primitive: we compose a plain <button> (runs the selected export) with
 * a Radix DropdownMenu (caret → choose CSV/Excel). Mirrors the app's
 * SplitButton/ExportSelector: picking a format selects it AND exports.
 *
 * Each half gets its OWN ripple (inside the button, above its fill) — a single
 * ripple at the .split level would sit behind the half-buttons and be hidden by
 * their opaque hover fill.
 */
export const ExportButton = () => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const selected = OPTIONS.find(o => o.value === format) ?? OPTIONS[0];
  const mainRipple = useRipple();
  const caretRipple = useRipple();

  // Mockup: no real file yet — this is where the export would fire.
  const runExport = (value: ExportFormat) => {
    setFormat(value);
  };

  return (
    <div className={styles.split}>
      <button
        type="button"
        className={styles.main}
        onClick={() => runExport(format)}
        onPointerDown={mainRipple.onPointerDown}
      >
        <span className={styles.icon}>
          <DownloadIcon />
        </span>
        <span className={styles.label}>{selected.label}</span>
        {mainRipple.rippleNodes}
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={styles.caret}
            aria-label="Export options"
            onPointerDown={caretRipple.onPointerDown}
          >
            <ChevronDownIcon className={styles.caretIcon} />
            {caretRipple.rippleNodes}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={menu.content}
            align="end"
            sideOffset={4}
          >
            {OPTIONS.map(option => (
              <DropdownMenu.Item
                key={option.value}
                className={menu.item}
                onSelect={() => runExport(option.value)}
              >
                <span className={menu.label}>{option.label}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
