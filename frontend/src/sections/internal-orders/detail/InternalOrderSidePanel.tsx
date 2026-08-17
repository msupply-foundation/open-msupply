import { For, Show, type Component } from 'solid-js';
import { t, localisedDate } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { homeCurrency } from '../../../intl/currency';
import {
  SidePanelSection,
  SidePanelActions,
} from '../../../ui/layout/SidePanel/SidePanel';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { UserLabel } from '../../../ui/elements/typography/UserLabel';
import { Text } from '../../../ui/elements/typography/Text';
import { RecordLink } from '../../../ui/elements/typography/RecordLink';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { Popover } from '../../../ui/elements/feedback/Popover';
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { type DebouncedEdit } from '../../../domain/debouncedEdit';
import {
  inboundShipmentHref,
  scopeOf,
} from '@/sections/inbound-shipments/inboundShipmentScope';
import { approvalStatusLabel } from '../list/internalOrderStatus';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';
import { type HeaderEditFields } from './InternalOrderToolbar';
import { DeleteInternalOrderAction } from './actions/DeleteInternalOrderAction';

// The internal-order detail side panel (spec/internal-orders S5). Sections, in
// order: Order info (approval, gated) · Program info (program orders) ·
// Additional info (entered-by / created / colour / comment) · Related documents
// (fulfilling inbound shipments + the gated source requisition) · Pricing (the
// indicative grand total, gated) · Actions (Delete + Copy). The two editable
// fields — colour and comment — are disabled off Draft; the reads show on every
// status.

export interface InternalOrderSidePanelProps {
  storeId: string;
  node: InternalOrderInfoFragment;
  editable: boolean;
  isProgram: boolean;
  /** The linked copy carries an approval status (AC-L9 analogue). */
  showApproval: boolean;
  /** Indicative-pricing preference on → the Pricing grand total (AC-IP5). */
  showPricing: boolean;
  /** create-internal-order-from-a-requisition preference → the source row. */
  showSourceLink: boolean;
  /**
   * The shared header edit buffer (comment rides it, as theirReference does).
   */
  edit: DebouncedEdit<HeaderEditFields>;
  /** Colour save (the buffered comment saves through the buffer itself). */
  onSaveField: (patch: Record<string, unknown>) => void;
  onDeleted: () => void;
}

const money = (value: number): string =>
  formatNumber(value, {
    style: 'currency',
    currency: homeCurrency(),
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const InternalOrderSidePanel: Component<
  InternalOrderSidePanelProps
> = props => {
  const grandTotal = () =>
    props.node.lines.nodes.reduce(
      (sum, line) => sum + (line.pricePerUnit ?? 0) * line.requestedQuantity,
      0
    );

  // The shipment row's hover annotation — created date + by whom (AC-RD1).
  const shipmentTooltip = (createdDatetime: string, username?: string) =>
    `${t('messages.inbound-shipment-created-on', {
      date: localisedDate(createdDatetime),
    })} ${t('messages.by-user', { username: username ?? '—' })}`;

  return (
    <>
      {/* Order info — approval status, only when the linked copy carries one. */}
      <Show when={props.showApproval}>
        <SidePanelSection
          value="order-info"
          title={t('heading.order-info')}
          collapsible
        >
          <FieldRow label={t('label.auth-status')}>
            <span>{approvalStatusLabel(props.node.approvalStatus)}</span>
          </FieldRow>
        </SidePanelSection>
      </Show>

      {/* Program info — program orders only, read-only. */}
      <Show when={props.isProgram}>
        <SidePanelSection
          value="program-info"
          title={t('heading.program-info')}
          collapsible
        >
          <FieldRow label={t('label.order-type')}>
            <span>{props.node.orderType ?? '—'}</span>
          </FieldRow>
          <FieldRow label={t('label.program')}>
            <span>{props.node.program?.name ?? '—'}</span>
          </FieldRow>
          <FieldRow label={t('label.period')}>
            <span>{props.node.period?.name ?? '—'}</span>
          </FieldRow>
        </SidePanelSection>
      </Show>

      {/* Additional info — entered-by / created / colour / comment. */}
      <SidePanelSection
        value="additional-info"
        title={t('heading.additional-info')}
        collapsible
      >
        <FieldRow label={t('label.entered-by')}>
          {/* The recorded user's name, a dash when none, an info tooltip with
              their email when known (spec S5). */}
          <UserLabel
            username={props.node.user?.username}
            email={props.node.user?.email}
            label={t('label.entered-by')}
            testId="entered-by-field"
          />
        </FieldRow>
        <FieldRow label={t('label.created')}>
          <span>{localisedDate(props.node.createdDatetime)}</span>
        </FieldRow>
        <FieldRow label={t('label.color')}>
          {/* The picker only while editable (spec S5 — colour + comment are
              the two editable fields, disabled when read-only); a read-only
              order shows the dot, as the list column does (AC-T1). */}
          <Show
            when={props.editable}
            fallback={<ColourTagDot colour={props.node.colour ?? null} />}
          >
            <ColourTagPicker
              colour={props.node.colour ?? null}
              variant="field"
              onSelect={colour => props.onSaveField({ colour })}
            />
          </Show>
        </FieldRow>
        <FieldRow label={t('heading.comment')}>
          <TextArea
            label={t('heading.comment')}
            hideLabel
            data-testid="comment-field"
            value={props.edit.state.comment}
            disabled={!props.editable}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Related documents — fulfilling shipments + the gated source link. */}
      <SidePanelSection
        value="related-documents"
        title={t('heading.related-documents')}
        collapsible
      >
        <Show
          when={props.node.shipments.nodes.length > 0}
          fallback={<span>{t('messages.no-shipments-yet')}</span>}
        >
          <For each={props.node.shipments.nodes}>
            {shipment => (
              <Text variant="body">
                {/* The label is a hover popover carrying the created-on / by-
                    whom annotation (AC-RD1) — a real popover, not a native
                    `title`, so it also opens on keyboard focus. The label (not
                    the entry) triggers it because the number is itself a link
                    — nesting one interactive in another is invalid. */}
                <Popover
                  trigger={t('label.shipment')}
                  openOnHover
                  placement="top"
                >
                  <p>
                    {shipmentTooltip(
                      shipment.createdDatetime,
                      shipment.user?.username
                    )}
                  </p>
                </Popover>{' '}
                {/* A shipment reference is neutral — no `kind` tone. */}
                <RecordLink
                  href={inboundShipmentHref(
                    props.storeId,
                    shipment.id,
                    scopeOf(shipment.purchaseOrderId)
                  )}
                >
                  {`#${shipment.invoiceNumber}`}
                </RecordLink>
              </Text>
            )}
          </For>
        </Show>
        <Show when={props.showSourceLink && props.node.createdFromRequisition}>
          {source => (
            <Text variant="body">
              <Popover
                trigger={t('label.created-from-requisition')}
                openOnHover
                placement="top"
              >
                <p>
                  {shipmentTooltip(
                    source().createdDatetime,
                    source().user?.username
                  )}
                </p>
              </Popover>{' '}
              {/* A requisition reference wears the io kind tone. */}
              <RecordLink
                href={`/${props.storeId}/distribution/customer-requisition/${source().id}`}
                kind="io"
              >
                {`#${source().requisitionNumber}`}
              </RecordLink>
            </Text>
          )}
        </Show>
      </SidePanelSection>

      {/* Pricing — the indicative grand total, on any status when gated. */}
      <Show when={props.showPricing}>
        <SidePanelSection
          value="pricing"
          title={t('heading.pricing')}
          collapsible
        >
          <FieldRow label={t('heading.grand-total')}>
            <strong data-testid="grand-total-field">
              {money(grandTotal())}
            </strong>
          </FieldRow>
        </SidePanelSection>
      </Show>

      {/* Actions — Delete (Draft only) + Copy (always). */}
      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          <DeleteInternalOrderAction
            storeId={props.storeId}
            orderId={props.node.id}
            orderNumber={props.node.requisitionNumber}
            disabled={!props.editable}
            onDeleted={props.onDeleted}
          />
          {/* Copy to clipboard — the shared control (controls § copy to
              clipboard). No extra fetch: the detail node this panel renders
              already carries the header, the UNPAGINATED lines connector, and
              the linked references (contract § copy to clipboard), and the
              order's JSON is 4-space indented. */}
          <CopyToClipboardButton load={() => props.node} indent={4} />
        </SidePanelActions>
      </SidePanelSection>
    </>
  );
};
