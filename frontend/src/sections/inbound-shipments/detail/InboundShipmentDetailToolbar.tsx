import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { DateField } from '../../../ui/elements/inputs/DateField';
import {
  dateToOffsetIso,
  isoDateToDate,
  localTodayIso,
  utcToLocalDay,
} from '../../../ui/elements/inputs/dateTimeConvert';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { RecordLink } from '../../../ui/elements/typography/RecordLink';
import { poLabel } from '../linkedOrder';
import { NameSearch, type NameOption } from '../../../domain/name';
import type { InboundInfoFragment } from './inboundShipmentDetail.generated';
import type { InboundFieldEdit } from './inboundShipmentEdit';
import { kindOf, supplierIsStore } from './inboundShipmentStatus';
import type { UpdateInboundShipmentVariables } from './inboundShipmentDetail.generated';

export interface InboundShipmentDetailToolbarProps {
  storeId: string;
  node: InboundInfoFragment;
  /** True once Verified (global edit lock). */
  disabled: boolean;
  edit: InboundFieldEdit;
  /** Store backdating gate + window (from inboundShipmentPreferences). */
  backdatingEnabled: boolean;
  backdatingMaxDays: number;
  onSaveField: (
    patch: Partial<Omit<UpdateInboundShipmentVariables['input'], 'id'>>
  ) => Promise<{ ok: boolean; message?: string }>;
}

/*
 * The detail header's field cluster (spec S3 § header fields), rendered as the
 * children of the page's <HeaderToolbar>: each field carries its own label
 * above a small control, and HeaderToolbar's FormRow gives them equal shares
 * that wrap as a unit (ui/docs/PAGES.md § header field cluster). The kind
 * banner is NOT here — it's the cluster's trailing compact Alert, passed to
 * <HeaderToolbar alert={…}> by the view.
 */
export const InboundShipmentDetailToolbar: Component<
  InboundShipmentDetailToolbarProps
> = props => {
  const kind = () => kindOf(props.node);

  // The received date is enabled while Received + backdating-on, yet the server
  // can still refuse the save (moving the date forward, or beyond the store's
  // max-days window). Those come back as untyped rejections; surface the
  // verdict on the field itself (spec S7 / AC-B), request preserved. It's the
  // DateField's own `error` rather than a sibling Alert so the cluster's row
  // stays a row of fields.
  const [receivedError, setReceivedError] = createSignal<string>();

  // The chosen backdate awaiting confirmation (the picked day + the instant
  // to save) — the re-stamp it causes can't be undone (rules § backdating
  // the received date), so it's confirmed first; undefined when no
  // confirmation is open.
  const [pendingReceived, setPendingReceived] = createSignal<{
    day: string;
    received: string;
  }>();
  // The user's un-saved picked day, so a cancelled pick reverts the input —
  // the node hasn't changed, so the controlled `value` alone wouldn't
  // (mirrors PickedDateField.tsx's fix for the same class of bug).
  const [draftReceivedDay, setDraftReceivedDay] = createSignal<string>();
  // A confirmed backdate is saving — onClose (which always follows
  // onConfirm) must not revert the draft while it is.
  let confirmInFlight = false;

  // Supplier is editable only on a manual shipment that isn't Verified — never
  // on a transfer or a PO-linked shipment (spec S3 header fields).
  const supplierLocked = () => props.disabled || kind() !== 'manual';

  const selectedSupplier = (): NameOption => ({
    id: props.node.otherPartyId,
    name: props.node.otherPartyName,
    code: '',
    isSupplier: true,
    isDonor: false,
    isOnHold: false,
    isStore: supplierIsStore(props.node),
  });

  // Received date: editable only when Received/Verified, backdating is enabled,
  // and within the window — else disabled with the reason. Server enforces;
  // the client only mirrors standing editability (spec S3 / validation.md).
  const isReceived = () =>
    props.node.status === 'RECEIVED' || props.node.status === 'VERIFIED';
  const receivedDateEditable = () =>
    isReceived() && props.backdatingEnabled && !props.disabled;
  const receivedDateReason = () => {
    if (props.disabled) return t('error.inbound-shipment-not-editable');
    if (!isReceived()) return t('messages.can-only-backdate-received');
    if (!props.backdatingEnabled) return t('messages.backdating-not-enabled');
    return undefined;
  };

  return (
    <>
      <NameSearch
        label={t('label.supplier-name')}
        size="small"
        storeId={props.storeId}
        role="supplier"
        selected={selectedSupplier()}
        disabled={supplierLocked()}
        onSelect={name => name && props.onSaveField({ otherPartyId: name.id })}
      />

      <TextArea
        label={t('label.reference')}
        size="small"
        rows={1}
        data-testid="supplier-reference-field"
        value={props.edit.state.theirReference}
        disabled={props.disabled}
        onInput={e =>
          props.edit.setField('theirReference', e.currentTarget.value)
        }
        onBlur={() => props.edit.flush()}
      />

      <DateField
        label={t('label.received')}
        size="small"
        value={draftReceivedDay() ?? utcToLocalDay(props.node.receivedDatetime)}
        disabled={!receivedDateEditable()}
        // The blocking reason is a TOOLTIP on the label, per spec S3 ("disabled
        // state carries an explanatory tooltip for each blocking reason") — not
        // permanent helper text, which wraps to three lines in this dense row
        // and drags the whole strip taller than the fields it explains.
        labelInfo={
          <Show when={receivedDateReason()}>
            {reason => <InfoTooltip text={reason()} />}
          </Show>
        }
        error={receivedError()}
        // Backdating only ever moves the date earlier — cap at the current
        // received date. (Server also bounds by the max-days window.)
        max={utcToLocalDay(props.node.receivedDatetime) ?? undefined}
        onChange={value => {
          const picked = isoDateToDate(value);
          if (!value || !picked) return;
          setReceivedError(undefined);
          // Offset-preserving so the server's backdating log records the
          // picked local day (input is DateTime<FixedOffset>; #456). Today
          // → the current moment; a backdated day → its local start (matches
          // the current app).
          const received =
            value === localTodayIso()
              ? dateToOffsetIso(new Date())
              : dateToOffsetIso(picked);
          // The re-stamp this causes can't be undone (rules § backdating the
          // received date), so it's confirmed before saving — not applied
          // straight away like the rest of this cluster's fields.
          setDraftReceivedDay(value);
          setPendingReceived({ day: value, received });
        }}
      />
      <Show when={pendingReceived()}>
        {info => (
          <ConfirmDialog
            open
            onClose={() => {
              setPendingReceived(undefined);
              if (!confirmInFlight) setDraftReceivedDay(undefined);
            }}
            title={t('heading.are-you-sure')}
            message={t('messages.confirm-backdate-received-date', {
              date: localisedDate(info().received),
            })}
            onConfirm={() => {
              confirmInFlight = true;
              void props
                .onSaveField({ receivedDatetime: info().received })
                .then(r => {
                  confirmInFlight = false;
                  setDraftReceivedDay(undefined);
                  setReceivedError(r.ok ? undefined : r.message);
                });
            }}
          />
        )}
      </Show>

      {/* PO-linked: PO number (links to the order) + read-only reference (spec
          S3 header fields). Never-editable facts, so they're read-only
          LabelledValues sitting flush among the inputs (variant="field") —
          read-only reads from the absence of a box, not a greyed-out one. The
          link is the shared kind-toned RecordLink, identical to the side
          panel's Related-documents entry (same route, same PO-xxx label, so a
          reader learns the kind by tone app-wide) — a DEAD link for now: this
          app mounts only the inbound-shipment vertical (App.tsx), so
          /replenishment/purchase-order has no component yet. It resolves the
          day someone implements the purchase-order vertical; kept in step with
          the side panel so both light up together. */}
      <Show when={props.node.purchaseOrder}>
        {po => (
          <>
            <LabelledValue
              label={t('label.purchase-order')}
              variant="field"
              size="small"
            >
              <RecordLink
                href={`/${props.storeId}/replenishment/purchase-order/${po().id}`}
                kind="po"
              >
                {poLabel(po().number)}
              </RecordLink>
            </LabelledValue>
            <Show when={po().reference}>
              <LabelledValue
                label={t('label.reference')}
                variant="field"
                size="small"
              >
                {po().reference}
              </LabelledValue>
            </Show>
          </>
        )}
      </Show>
    </>
  );
};
