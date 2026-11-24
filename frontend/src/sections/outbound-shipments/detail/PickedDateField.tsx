import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { graphqlFetch } from '../../../api/graphql';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { dateToCalendarDate } from '../../../intl/calendarDate';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import {
  DeleteOutboundLines,
  OutboundLineIds,
  OutboundLines,
  OutboundStocktakeConflict,
} from './outboundDetail.generated';
import { outboundShipmentPreferences } from '@/store/storeContext';
import type { OutboundNode } from './outboundUpdate';
import {
  backdateBounds,
  backdateWarnings,
  backdatedDatetimeFor,
  backdatingGate,
  withinBackdateBounds,
  type BackdateWarningKey,
} from './backdating';

// The picked-date backdating control (spec/outbound-shipments rules.md §
// backdating; S3 side panel — OMS-REG-DIST-04.23..27). Enabled only while NEW
// with the backdating preference on; otherwise DISABLED WITH THE REASON (pref
// off / past NEW). Picking an earlier day confirms first — the line-removal
// warning (OMS-REG-DIST-04.24) and, when a stocktake was counted on or after
// that day, the stocktake-conflict warning (OMS-REG-DIST-04.27) — before
// deleting the shipment's lines (the server rejects backdating a shipment
// that has any — the caller deletes them, as prescriptions do,
// open-msupply#12615) and setting backdatedDatetime; the parent's field save
// then re-issues against historical availability and stamps future statuses
// at the backdated time (server-side). The picker is bounded to [today − (maxDays − 1), today] —
// maxDays 0/unset = unbounded past (backdating.ts) — so a future or over-limit
// day can't be chosen (the remaining OMS-REG-DIST-04.23 rejections). The pure
// gate/date/warning logic lives in ./backdating (unit-tested); this component
// wires it to the UI + the stocktake-conflict query.

export interface PickedDateFieldProps {
  storeId: string;
  node: OutboundNode;
  /** Panel-wide read-only gate (SHIPPED onward). */
  disabled: boolean;
  /** Apply the backdate — sets backdatedDatetime (parent saves + refetches).
   * Resolves once the node reflects the save (or the save failed): the field
   * keeps showing the chosen day until then, so the confirmed pick never
   * flickers back to the old day for the save round-trip. */
  onBackdate: (backdatedDatetime: string) => Promise<void>;
  /** The line delete before a backdate failed or its outcome is unknown
   * (a lost reply may still have committed) — the parent refetches the lines
   * and totals so the page shows what the server holds. */
  onLinesChanged: () => Promise<void>;
}

export const PickedDateField: Component<PickedDateFieldProps> = props => {
  // The chosen backdate awaiting confirmation (its ISO datetime + the warning
  // keys to show); undefined when no confirmation is open.
  const [pending, setPending] = createSignal<{
    backdatedDatetime: string;
    warningKeys: BackdateWarningKey[];
  }>();
  // The user's un-saved picked day, so a cancelled pick reverts the input
  // (the controlled `value` alone wouldn't — the node hasn't changed).
  const [draft, setDraft] = createSignal<string>();
  // A confirmed backdate is saving — onClose (which always follows
  // onConfirm) must not revert the draft while it is. Plain flag: nothing
  // renders from it.
  let confirmInFlight = false;

  const backdating = () => outboundShipmentPreferences().backdating;
  const gate = () =>
    backdatingGate({
      status: props.node.status,
      shipmentsEnabled: backdating().shipmentsEnabled,
      panelDisabled: props.disabled,
    });
  const enabled = () => gate().enabled;

  // The effective "as of" day: the backdated day if set, else picked, else the
  // creation day.
  const effectiveDay = () =>
    dateToCalendarDate(
      new Date(
        props.node.backdatedDatetime ??
          props.node.pickedDatetime ??
          props.node.createdDatetime
      )
    );
  const shown = () => draft() ?? effectiveDay();
  const bounds = () => backdateBounds(new Date(), backdating()?.maxDays ?? 0);

  // Delete every line on the shipment (stock, placeholder and service — the
  // server counts them all) through the same batch the bulk delete uses, so
  // each releases what it reserved (OMS-REG-SMV-03.13). False when either
  // call failed (graphqlFetch has already raised the error modal). A line
  // that individually refuses to delete is left to the backdate save, which
  // the server then rejects with its own message.
  const deleteAllLines = async (): Promise<boolean> => {
    const ids = await graphqlFetch(OutboundLineIds, {
      storeId: props.storeId,
      invoiceId: props.node.id,
    });
    if (ids.kind !== 'success') return false;
    const lines = ids.data.invoiceLines.nodes;
    const byType = (type: (typeof lines)[number]['type']) =>
      lines.filter(line => line.type === type).map(line => ({ id: line.id }));
    const result = await graphqlFetch(DeleteOutboundLines, {
      storeId: props.storeId,
      stockLines: byType('STOCK_OUT'),
      placeholders: byType('UNALLOCATED_STOCK'),
      serviceLines: byType('SERVICE'),
    });
    return result.kind === 'success';
  };

  // Confirmed: lines first (when there were any), then the backdate. The
  // draft holds the chosen day until the node reflects the save. A failed
  // delete stops before the backdate but still refreshes the page: a lost
  // reply may have committed, and the table must not keep showing deleted
  // lines (onBackdate refreshes on the success path).
  const applyConfirmed = async (info: {
    backdatedDatetime: string;
    warningKeys: BackdateWarningKey[];
  }) => {
    const hasLines = info.warningKeys.includes(
      'messages.confirm-backdate-picked-date'
    );
    if (hasLines && !(await deleteAllLines())) {
      await props.onLinesChanged();
      return;
    }
    await props.onBackdate(info.backdatedDatetime);
  };

  const onPick = async (day: string) => {
    if (!day || day === effectiveDay()) {
      setDraft(undefined);
      return;
    }
    setDraft(day);
    const backdatedDatetime = backdatedDatetimeFor(new Date(), day);
    // Stocktake-conflict check (OMS-REG-DIST-04.27): any stocktake counted on
    // or after the chosen day. A non-success is UNKNOWN, not "no conflict" —
    // fail closed: revert the pick and let the global unexpected-error modal
    // (already raised by graphqlFetch) explain, rather than backdating
    // unconfirmed.
    const result = await graphqlFetch(OutboundStocktakeConflict, {
      storeId: props.storeId,
      onOrAfter: day,
    });
    if (result.kind !== 'success') {
      setDraft(undefined);
      return;
    }
    const stocktakeConflict = result.data.stocktakes.totalCount > 0;
    // "Existing lines will be removed" needs the WHOLE shipment's line count —
    // the entity query no longer carries lines and the view's page is
    // filtered, so probe the server (count only), failing closed as above.
    const linesResult = await graphqlFetch(OutboundLines, {
      storeId: props.storeId,
      filter: { invoiceId: { equalTo: props.node.id } },
      page: { first: 1 },
    });
    if (linesResult.kind !== 'success') {
      setDraft(undefined);
      return;
    }
    const warningKeys = backdateWarnings({
      hasLines: linesResult.data.invoiceLines.totalCount > 0,
      stocktakeConflict,
    });
    // Nothing to warn about → apply directly; otherwise confirm first. The
    // draft holds the chosen day on screen until the node reflects the save
    // (a failed save reverts — the node is unchanged and the draft clears).
    if (warningKeys.length === 0) {
      await props.onBackdate(backdatedDatetime);
      setDraft(undefined);
      return;
    }
    setPending({ backdatedDatetime, warningKeys });
  };

  // The confirmation body: the applicable warnings (OMS-REG-DIST-04.24/.27),
  // each resolved with the chosen date (spec S6 § confirmation dialog). Each
  // warning sits on its own block (both ported sentences end in "Are you
  // sure…?", so joined into one line they read as a run-on); <br/> not <p> —
  // the Dialog already renders the description inside a <p>.
  const confirmMessage = () => {
    const info = pending();
    if (!info) return '';
    const date = localisedDate(info.backdatedDatetime);
    return info.warningKeys.map((key, index) => (
      <>
        <Show when={index > 0}>
          <br />
          <br />
        </Show>
        {t(key, { date })}
      </>
    ));
  };

  return (
    <>
      <HStack gap="sm">
        <DateField
          label={t('label.picked-date')}
          hideLabel
          // A date is a short value, so the field is compact (SIDE_PANEL.md
          // rule 2) — which is also what keeps it from filling the panel row's
          // whole control column and crowding out the reason bubble beside it.
          size="small"
          width="compact"
          // The shared calendar-date input (ui-standards/inputs § dates &
          // times — typed entry or the picker, never a native date input).
          // `required`: a picked date always has an effective day — blanking
          // the text reverts rather than clearing.
          required
          testId="picked-date-field"
          value={shown()}
          min={enabled() ? bounds().min : undefined}
          max={enabled() ? bounds().max : undefined}
          disabled={!enabled()}
          onChange={value => {
            // OMS-REG-DIST-04.23 re-check as defence in depth — DateField
            // already reverts typed out-of-range entries against min/max.
            if (!value || !withinBackdateBounds(bounds(), value)) return;
            void onPick(value);
          }}
        />
        {/* When a backdating gate disables the field (pref off / past NEW), an
            info popover explains why on hover / focus / tap — disable-with-
            reason (spec S3), reusing the ported reason messages. */}
        <Show when={gate().reasonKey}>
          {key => (
            <InfoTooltip
              text={t(key())}
              label={t(key())}
              triggerTestId="picked-date-reason"
            />
          )}
        </Show>
      </HStack>
      <ConfirmDialog
        open={pending() != null}
        title={t('heading.are-you-sure')}
        message={confirmMessage()}
        onClose={() => {
          setPending(undefined);
          // ConfirmDialog's OK calls onConfirm THEN onClose — a cancelled
          // pick reverts the input here, but a CONFIRMED one must keep the
          // draft on screen through the save round-trip (clearing it now
          // would snap back to the OLD day until the node updates).
          if (!confirmInFlight) setDraft(undefined);
        }}
        onConfirm={() => {
          const info = pending();
          if (!info) return;
          confirmInFlight = true;
          void applyConfirmed(info).then(() => {
            confirmInFlight = false;
            setDraft(undefined);
          });
        }}
      />
    </>
  );
};
