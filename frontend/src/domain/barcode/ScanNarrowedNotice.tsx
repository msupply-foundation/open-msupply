// The line editor's note that a scan narrowed the stock it offers
// (spec/barcode-scanning ui-surface § Notices; rules § Narrowing the stock
// offered). The narrowing is a default, not a rule: "Show all" clears it
// (.211). Shared by the outbound shipment's and the dispensing record's line
// editors so the two cannot drift.

import { Show } from 'solid-js';
import { t } from '@/intl';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';

export const ScanNarrowedNotice = (props: {
  /** The one batch left on offer, where the narrowing left one. */
  batch?: string;
  /** The narrowing ruled out every row. */
  nothingLeft: boolean;
  onShowAll: () => void;
}) => (
  <Alert severity="info" testId="scan-narrowed-batch">
    <span>
      <Show
        when={!props.nothingLeft && props.batch}
        fallback={t(
          props.nothingLeft
            ? 'messages.scan-matched-no-stock'
            : 'messages.scan-narrowed'
        )}
      >
        {batch => t('messages.scan-narrowed-to-batch', { batch: batch() })}
      </Show>
    </span>{' '}
    <Button
      variant="ghost"
      data-testid="scan-show-all-batches"
      onClick={() => props.onShowAll()}
    >
      {t('button.show-all')}
    </Button>
  </Alert>
);
