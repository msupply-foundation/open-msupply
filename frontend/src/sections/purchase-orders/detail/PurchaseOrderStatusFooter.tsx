import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import {
  Pagination,
  type PaginationProps,
} from '@/ui/elements/table/Pagination';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { ArrowRightIcon } from '@/ui/icons';
import { Stack } from '@/ui/layout/Stack/Stack';
import { hasPermission } from '@/store/storeContext';
import { poStatusLabel, type PurchaseOrderStatus } from '../purchaseOrderStatus';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';
import {
  currentStep,
  ladderFor,
  moveConfirmation,
  moveRefusal,
  nextStatus,
  statusMoment,
} from './purchaseOrderLadder';

export interface PurchaseOrderStatusFooterProps {
  node: PurchaseOrderInfoFragment;
  /**
   * Whether the store requires authorisation (the approval rung's existence).
   */
  authorisationRequired: boolean;
  /** The order's whole line count, and how many carry no quantity. */
  lineCount: number;
  emptyLineCount: number;
  /** Whether any line is still owed stock — the finalise warning differs. */
  stockStillOwed: boolean;
  /**
   * The line table's pager, hosted HERE rather than in a band of its own
   * (ui-standards/tables.md § pagination & scale): this bar is present at every
   * line count, so an order that pages gets its controls without a second row
   * of chrome.
   */
  pagination: PaginationProps;
  /** Commit the move; resolves to the server's verdict. */
  onMove: (status: PurchaseOrderStatus) => Promise<{
    ok: boolean;
    message?: string;
  }>;
}

/*
 * The state ladder (spec/purchase-orders S6 § state ladder, S18): the five
 * states in order, each stamped with the moment it was reached, and the move
 * to the NEXT one — a button reading "Confirm <state>". A Finalised order
 * offers no move at all.
 *
 * Every guarantee the ladder makes is THIS component's: the domain compares
 * the requested status against the current one for inequality only, so nothing
 * server-side stops an order moving backwards or jumping forward (contract ⚠️
 * the ladder is a client-side convention). Two of its gates are likewise ours
 * alone — an order with no lines or an empty line, and the authorise
 * permission on entering Ready for sending — and both decline the move IN
 * PLACE without ever raising the confirmation (spec S18).
 */
export const PurchaseOrderStatusFooter: Component<
  PurchaseOrderStatusFooterProps
> = props => {
  const [confirming, setConfirming] = createSignal<PurchaseOrderStatus>();
  const [busy, setBusy] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const status = () => props.node.status as PurchaseOrderStatus;
  const target = () => nextStatus(status(), props.authorisationRequired);

  const steps = () =>
    ladderFor(props.authorisationRequired).map(rung => ({
      label: poStatusLabel(rung),
      date: statusMoment(props.node, rung),
    }));

  // Why the move is declined before it is attempted, or undefined. Read at
  // CLICK time, not as a disabled predicate: a refusal that names its reason
  // is more use than a button that cannot be pressed
  // (ui-standards/validation.md § actions).
  const refusal = (to: PurchaseOrderStatus) =>
    moveRefusal({
      target: to,
      authorisationRequired: props.authorisationRequired,
      canAuthorise: hasPermission('PURCHASE_ORDER_AUTHORISE'),
      lineCount: props.lineCount,
      emptyLineCount: props.emptyLineCount,
    });

  const start = (to: PurchaseOrderStatus) => {
    setErrorMessage(undefined);
    const declined = refusal(to);
    if (declined) {
      setErrorMessage(declined);
      return;
    }
    setConfirming(to);
  };

  const commit = async (to: PurchaseOrderStatus) => {
    if (busy()) return;
    setBusy(true);
    const result = await props.onMove(to);
    setBusy(false);
    setConfirming(undefined);
    if (!result.ok) setErrorMessage(result.message);
  };

  return (
    <ContentFooter>
      <StatusIndicator
        steps={steps()}
        current={currentStep(status(), props.authorisationRequired)}
      />

      {/* The line pager, sharing this bar (`inBar` — it sizes to its own
          cluster so a crowded bar wraps it whole rather than crushing it). */}
      <Pagination {...props.pagination} inBar />

      {/* A declined or rejected move shows here, at the control. A blocked
          move names the offending items and the table marks those lines; a
          finalise blocked by an unverified shipment names that instead —
          though its wording denies a delivered shipment exists, which is the
          server's message, not ours (contract ⚠️). */}
      <Show when={errorMessage()}>
        {message => (
          <Alert severity="error" testId="status-error">
            {message()}
          </Alert>
        )}
      </Show>

      <ContentFooterActions>
        <Show when={target()}>
          {to => (
            <Button
              variant="primary"
              icon={<ArrowRightIcon />}
              disabled={busy()}
              data-testid="status-change-button"
              onClick={() => start(to())}
            >
              {/* "Confirm <state>" — e.g. "Confirm Ready for sending". The key
                  is a TEMPLATE (`Confirm {{status}}`), so the state's label
                  goes THROUGH it; appending it instead leaves the placeholder
                  on screen. */}
              {t('button.save-and-confirm-status', {
                status: poStatusLabel(to()),
              })}
            </Button>
          )}
        </Show>
      </ContentFooterActions>

      <Show when={confirming()}>
        {to => {
          const confirmation = moveConfirmation(to(), props.stockStillOwed);
          return (
            <ConfirmDialog
              open
              onClose={() => setConfirming(undefined)}
              title={t('heading.are-you-sure')}
              message={
                <Show
                  when={confirmation.note}
                  fallback={confirmation.message}
                >
                  {note => (
                    <Stack gap="sm">
                      <span>{confirmation.message}</span>
                      {/* Entering Ready for sending also says what that state
                          means — the note follows the question (spec S18). */}
                      <Alert severity="info" compact>
                        {note()}
                      </Alert>
                    </Stack>
                  )}
                </Show>
              }
              // "Finalise anyway" for either finalising move; the standard
              // confirm otherwise.
              confirmLabel={confirmation.confirmLabel}
              onConfirm={() => void commit(to())}
            />
          );
        }}
      </Show>
    </ContentFooter>
  );
};
