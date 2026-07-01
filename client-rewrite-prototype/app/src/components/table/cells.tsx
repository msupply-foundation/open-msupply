import type { CSSProperties } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { MessageSquareIcon } from '@/components/icons';
import { StatusChip } from '@/components/ui/StatusChip';
import { STATUS_META, type InvoiceNodeStatus } from '@/mocks/outboundShipments';
import {
  EMPTY,
  formatCurrency,
  formatCurrencyFull,
  formatDate,
  formatNumber,
  formatNumberFull,
  hasMoreThanDp,
} from './format';
import styles from './cells.module.css';

/*
 * Cell renderers — faithful ports of the current app's built-in column types
 * (client/.../ui/layout/tables/components + useGetColumnDefDefaults). Each is
 * plain markup + CSS; the "within-cell" behaviours that make an OMS table feel
 * like one (right-aligned figures, the "…" more-precision hint with a
 * full-precision tooltip, ellipsis-with-tooltip text, the comment popover) live
 * here so every table inherits them.
 *
 * Tooltips use the native `title` attribute — announced by screen readers and
 * zero-bundle. The comment popover is the one that needs a real focus contract,
 * so it buys Radix Popover (opens on click/focus, keyboard-dismissable) rather
 * than the app's hover-only popover, which keyboard users can't reach.
 */

/** Right-aligned number with the "…" more-precision hint + full-precision tooltip. */
export const NumericCell = ({
  value,
  decimalLimit = 2,
  suffix = '',
}: {
  value: number | null;
  decimalLimit?: number;
  suffix?: string;
}) => {
  if (value == null) return <span className={styles.numeric}>{EMPTY}</span>;
  const more = decimalLimit > 0 && hasMoreThanDp(value, decimalLimit);
  return (
    <span
      className={styles.numeric}
      title={more ? formatNumberFull(value) : undefined}
    >
      {formatNumber(value, decimalLimit)}
      {more ? '…' : ''}
      {suffix}
    </span>
  );
};

/** Currency — like numeric, plus "< [0.01]" for tiny non-zero values. */
export const CurrencyCell = ({ value }: { value: number | null }) => {
  if (value == null) return <span className={styles.numeric}>{EMPTY}</span>;
  if (value > 0 && value < 0.01) {
    return (
      <span className={styles.numeric} title={formatCurrencyFull(value)}>
        {`< ${formatCurrency(0.01)}`}
      </span>
    );
  }
  const more = hasMoreThanDp(value, 2);
  return (
    <span
      className={styles.numeric}
      title={more ? formatCurrencyFull(value) : undefined}
    >
      {formatCurrency(value)}
      {more ? '…' : ''}
    </span>
  );
};

/** Right-aligned localised date. */
export const DateCell = ({ value }: { value: string | null }) => (
  <span className={styles.numeric}>{formatDate(value)}</span>
);

/** Ellipsised text with the full value on hover (title). */
export const TextWithTooltipCell = ({ value }: { value: string | null }) =>
  value ? (
    <span className={styles.ellipsis} title={value}>
      {value}
    </span>
  ) : null;

/** Name preceded by a colour dot (default grey) — the app's NameAndColorSetter look. */
export const NameColourCell = ({
  name,
  colour,
}: {
  name: string;
  colour: string | null;
}) => (
  <span className={styles.nameCell}>
    <span
      className={styles.colourDot}
      style={{ '--dot-colour': colour ?? 'var(--gray-main)' } as CSSProperties}
      aria-hidden
    />
    <span className={styles.ellipsis}>{name}</span>
  </span>
);

/** Status as a hand-rolled chip. */
export const StatusCell = ({ status }: { status: InvoiceNodeStatus }) => {
  const meta = STATUS_META[status];
  return <StatusChip label={meta.label} colour={meta.colour} />;
};

/** Comment — an icon that opens the text in a focus/keyboard-reachable popover. */
export const CommentCell = ({ comment }: { comment: string | null }) => {
  if (!comment) return null;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className={styles.commentButton} aria-label="Show comment">
          <MessageSquareIcon />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.commentPopover}
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
        >
          {comment}
          <Popover.Arrow className={styles.commentArrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
