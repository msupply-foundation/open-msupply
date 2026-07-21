import {
  createSignal,
  For,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { CheckIcon, XCircleIcon, ZapIcon } from '../../../../ui/icons';
import { AllocateOutboundLine } from '../outboundDetail.generated';
import type { OutboundLineFragment } from '../outboundDetail.generated';

export interface AllocateLinesActionProps {
  storeId: string;
  /** The selected LINE rows; only placeholders are allocatable. */
  selectedLines: () => OutboundLineFragment[];
  disabled: boolean;
  /** Something committed — the view refetches. */
  onCommitted: () => void;
}

// "Allocate placeholder lines" (spec S3 § bulk line actions, AC-AL1–AL5 + AC-A4):
// auto-allocation per selected placeholder — FEFO server-side. Outcomes are
// classified per line exactly as the current app does (fully allocated /
// partial / failed, with the skip reasons that applied) and reported as
// inline banners in the dialog's report phase (controls › action feedback —
// never a toast). A clean run just closes: the updated line table is the
// confirmation. Zero-quantity placeholders in the selection prompt a removal
// note in the confirmation (they are deleted by allocation). Runs only when
// explicitly invoked (rules.md § auto-allocation).
type Phase = 'confirm' | 'working' | 'report';

interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export const AllocateLinesAction: Component<
  AllocateLinesActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [issues, setIssues] = createSignal<Issue[]>([]);
  // Something changed server-side this run, so the grid must refetch and the
  // selection clear — but deferred to close() (see below).
  const [committed, setCommitted] = createSignal(false);

  const placeholders = () =>
    props.selectedLines().filter(line => line.type === 'UNALLOCATED_STOCK');
  const zeroQuantity = () =>
    placeholders().filter(line => line.numberOfPacks === 0);

  // The report phase is a results notice, not a confirmation — title it so
  // (an error present, e.g. "not allocated due to insufficient stock" ⇒ "Can't
  // do that!"; otherwise the neutral "Additional info"), never "Are you sure?".
  const dialogTitle = () =>
    phase() === 'report'
      ? issues().some(issue => issue.severity === 'error')
        ? t('heading.cannot-do-that')
        : t('heading.additional-info')
      : t('heading.are-you-sure');

  const openConfirm = () => {
    setPhase('confirm');
    setIssues([]);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    // Refetch the grid + clear the selection only as the dialog closes. Doing it
    // mid-run clears the selection, which unmounts this action (it lives in the
    // selection-gated bulk bar) and would kill the report dialog before the user
    // sees it — the outcome must be a modal notice, never a toast (spec S6, D19).
    if (committed()) {
      setCommitted(false);
      props.onCommitted();
    }
  };

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    // The run mutates server-side; defer the refetch + selection-clear to
    // close() so clearing the selection can't unmount the report dialog.
    setCommitted(true);
    const found: Issue[] = [];
    let allocated = 0;
    const partial = { count: 0, reasons: new Set<string>() };
    const failed = { count: 0, reasons: new Set<string>() };
    const expiringSoonBatches: string[] = [];
    for (const line of placeholders()) {
      const result = await graphqlFetch(AllocateOutboundLine, {
        storeId: props.storeId,
        lineId: line.id,
      });
      // Transport/unexpected → the global modal already surfaced it. Each line
      // is its own mutation (allocateOutboundShipmentUnallocatedLine), so lines
      // earlier in the loop may already be allocated server-side; refetch on a
      // mid-loop failure so the grid isn't left stale, then bail.
      if (result.kind !== 'success') {
        // Transport/unexpected — the global modal already surfaced it. Earlier
        // lines may already be allocated server-side; close() refetches + clears.
        return close();
      }
      const response = result.data.allocateOutboundShipmentUnallocatedLine;
      if (
        response.__typename === 'AllocateOutboundShipmentUnallocatedLineError'
      ) {
        found.push({ severity: 'error', message: response.error.description });
        continue;
      }
      // Classify like the current app: placeholder deleted → fully allocated;
      // otherwise some stock moved (insert, or updates beyond the placeholder
      // itself) → partial; nothing moved → failed. Skip categories become the
      // reasons list on the partial/failed report line (AC-AL2).
      if (response.deletes.some(deleted => deleted.id === line.id)) {
        allocated++;
      } else {
        const bucket =
          response.inserts.totalCount > 0 || response.updates.totalCount > 1
            ? partial
            : failed;
        bucket.count++;
        if (response.skippedExpiredStockLines.nodes.length)
          bucket.reasons.add(t('label.expired'));
        if (response.skippedOnHoldStockLines.nodes.length)
          bucket.reasons.add(t('label.on-hold'));
        if (response.skippedUnusableVvmStatusLines.nodes.length)
          bucket.reasons.add(t('label.unusable-vvm-status'));
      }
      for (const node of response.issuedExpiringSoonStockLines.nodes)
        expiringSoonBatches.push(node.batch ?? '—');
    }
    const reasonsSuffix = (reasons: Set<string>) =>
      reasons.size > 0
        ? ` ${t('messages.allocated-lines-skipped-line-reasons', {
            reasons: Array.from(reasons).join(', '),
          })}`
        : '';
    if (partial.count > 0)
      found.push({
        severity: 'warning',
        message:
          tPlural('messages.allocated-lines-partial', partial.count) +
          reasonsSuffix(partial.reasons),
      });
    if (failed.count > 0)
      found.push({
        severity: 'error',
        message:
          tPlural('messages.allocated-lines-failed', failed.count) +
          reasonsSuffix(failed.reasons),
      });
    if (expiringSoonBatches.length > 0)
      found.push({
        severity: 'info',
        message: t('label.expiring-soon', {
          batches: expiringSoonBatches.join(', '),
        }),
      });
    // The allocated count leads the report when there is one; a clean run
    // closes instead — the updated line table is the confirmation (D19).
    if (allocated > 0 && found.length > 0)
      found.unshift({
        severity: 'info',
        message: tPlural('messages.allocated-lines', allocated),
      });
    // Do NOT clear the selection here — that unmounts this action and kills the
    // report before it shows. A clean run closes (close() refetches + clears);
    // a run with issues shows the report, then refetches + clears on close.
    if (found.length === 0) return close();
    setIssues(found);
    setPhase('report');
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<ZapIcon />}
        data-testid="allocate-lines-button"
        disabled={props.disabled || placeholders().length === 0}
        onClick={openConfirm}
      >
        {t('button.allocate-lines')}
      </Button>
      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<ZapIcon />}
          testId="confirmation-modal"
          title={dialogTitle()}
          description={
            <Switch>
              <Match when={phase() !== 'report'}>
                {zeroQuantity().length > 0
                  ? tPlural(
                      'messages.empty-unallocated-lines',
                      zeroQuantity().length
                    )
                  : ''}
              </Match>
              <Match when={phase() === 'report'}>
                <For each={issues()}>
                  {issue => (
                    <Alert severity={issue.severity}>{issue.message}</Alert>
                  )}
                </For>
              </Match>
            </Switch>
          }
          actions={
            <Show
              when={phase() !== 'report'}
              fallback={
                <Button
                  variant="secondary"
                  icon={<CheckIcon />}
                  data-testid="dialog-button-ok"
                  onClick={close}
                >
                  {t('button.ok')}
                </Button>
              }
            >
              <Show when={phase() === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  data-testid="dialog-button-cancel"
                  onClick={close}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<CheckIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </Show>
          }
        />
      </Show>
    </>
  );
};
