import { Show } from 'solid-js';
import { t } from '@/intl';
import { StatusBadge } from '@/ui/elements/feedback/StatusBadge';
import { AlertCircleIcon, AlertTriangleIcon, PauseIcon } from '@/ui/icons';
import type { getCellDefinition } from '@/ui/elements/table/tableHelpers';

// The row-status badge cluster (ui-standards § table interaction;
// OMS-REG-DIST-03.37/.38, D111/D112), shared by the detail table (beside the
// item name) and the line editor's grid (beside the batch value): word chips
// carrying each line state — Expired / Near expiry (tiered, both red), On
// hold (amber). Every applicable badge shows (expired AND held → both).
// Table view only — cards carry the same states as their after-the-title
// chips (the [data-row-badges] CSS in DataTable.module.css hides the
// cluster there).
// The caller owns the predicates (its own line shape) and any gate — a
// placeholder carries no badge; its Batch cell's "Placeholder" word is the
// flag.
export const RowStatusBadges = (props: {
  expired: boolean;
  nearExpiry: boolean;
  held: boolean;
}) => (
  <span data-row-badges>
    <Show when={props.expired}>
      <StatusBadge
        label={t('label.expired')}
        tone="error"
        icon={<AlertCircleIcon />}
      />
    </Show>
    <Show when={props.nearExpiry}>
      <StatusBadge
        label={t('label.near-expiry')}
        tone="error"
        icon={<AlertTriangleIcon />}
      />
    </Show>
    <Show when={props.held}>
      <StatusBadge
        label={t('label.on-hold')}
        tone="warning"
        icon={<PauseIcon />}
      />
    </Show>
  </span>
);

// The cluster's companion column fix: the chips beside a batch value fill the
// `code` preset's 7rem growth cap exactly, and `maxSize` is a HARD cap — a
// column sitting at it can't be dragged wider at all (the #601 trap). This
// drops the cap while keeping the preset's cell + width floor. The shared
// config expresses cap-less as a per-key `maxSize: null`; at a call site the
// key has to be removed outright — an explicit `maxSize: undefined` would
// override TanStack's own default rather than fall back to it.
export const uncapped = <T,>({
  maxSize: _cap,
  ...rest
}: ReturnType<typeof getCellDefinition<T>>) => rest;
