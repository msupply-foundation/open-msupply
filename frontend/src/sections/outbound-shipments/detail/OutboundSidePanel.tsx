import {
  createSignal,
  For,
  Show,
  type Component,
  type JSX,
} from 'solid-js';
import { A } from '@solidjs/router';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import {
  SidePanelActions,
  SidePanelSection,
} from '../../../ui/layout/SidePanel/SidePanel';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { Popover } from '../../../ui/elements/feedback/Popover';
import { EditIcon, InfoIcon } from '../../../ui/icons';
import { ShippingMethodSelect } from '../../../domain/shippingMethod';
import { DeleteShipmentAction } from './actions';
import { DuplicateShipmentAction } from '../list/actions/DuplicateShipmentAction';
import { PickedDateField } from './PickedDateField';
import { CurrencyModal } from '../../../domain/invoice';
import { isDeletable } from '../outboundStatus';
import { changeShipmentCurrency, type OutboundNode } from './outboundUpdate';
import { graphqlFetch } from '../../../api/graphql';
import {
  FullOutbound,
  type OutboundLineFragment,
} from './outboundDetail.generated';
import type { OutboundFieldEdit } from './outboundEdit';

// The shipment side panel (spec S3 § side panel), sections top to bottom:
// Additional info · Related documents · Invoice details · Transport details,
// with the record actions pinned at the panel's end (SidePanel's convention).
// All inputs share the one editability gate (disabled prop).

export interface OutboundSidePanelProps {
  node: OutboundNode;
  /**
   * The shipment's service lines (the view's dedicated read — the entity
   * query no longer carries lines), for the Service-charges block's rows.
   */
  serviceLines: OutboundLineFragment[];
  /** For the backdating control's stocktake-conflict check (AC-B4). */
  storeId: string;
  disabled: boolean;
  /**
   * The _issue in foreign currency_ store preference — with the customer not
   * being a store, the ONLY gates on the change-currency control (spec S3 §
   * side panel: not gated by shipment status).
   */
  foreignCurrencyAllowed: boolean;
  /** The currency modal saved — replace the entity in place. */
  onSaved: (node: OutboundNode) => void;
  /** The shared edit buffer (comment + transport reference live here). */
  edit: OutboundFieldEdit;
  /** Field saves that aren't buffered text (colour, expected date, method).
   * Resolves once the entity reflects the save (or the save failed) — the
   * picked-date control awaits it to hand its optimistic value over without
   * a flicker. */
  onSaveField: (patch: {
    colour?: string;
    tax?: { percentage: number | null };
    expectedDeliveryDate?: { value: string | null };
    shippingMethodId?: { value: string | null };
    backdatedDatetime?: string | null;
  }) => Promise<void>;
  /** Open the service-charges editor (S5). */
  onEditServiceCharges: () => void;
}

const money = (value: number | null | undefined): string =>
  formatNumber(value ?? 0, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const OutboundSidePanel: Component<OutboundSidePanelProps> = props => {
  const pricing = () => props.node.pricing;
  const requisition = () => props.node.requisition;
  const serviceLines = () => props.serviceLines;
  // Change-currency is offered only when the store allows foreign currency
  // and the customer isn't itself a store — and, like every header edit,
  // only while the shipment is editable: the server rejects all header
  // updates from SHIPPED (the old app leaves this control clickable but the
  // edit silently does nothing — D65).
  const [currencyOpen, setCurrencyOpen] = createSignal(false);
  const canChangeCurrency = () =>
    props.foreignCurrencyAllowed &&
    props.node.otherParty.store == null &&
    !props.disabled;

  // Tax display derivations (rules.md § pricing): the amount is total − sub
  // total floored at zero; the service group shows the EFFECTIVE rate (tax
  // over subtotal), the items group shows the STORED shipment rate.
  const taxAmount = (
    before: number | null | undefined,
    after: number | null | undefined
  ) => Math.max((after ?? 0) - (before ?? 0), 0);
  const effectiveTaxPct = (
    before: number | null | undefined,
    after: number | null | undefined
  ) => (taxAmount(before, after) / ((before ?? 0) || 1)) * 100;
  const taxLabel = (pct: number) => `${t('label.tax')} (${pct.toFixed(2)}%)`;

  // Group headings sit a weight above the FieldRow labels' medium, so the
  // pricing groups read as groups.
  const groupHeading = (label: string, info: string): JSX.Element => (
    <span
      style={{
        display: 'inline-flex',
        'align-items': 'center',
        gap: 'var(--space-1)',
        'font-weight': 'var(--weight-bold)',
      }}
    >
      <Popover
        trigger={<InfoIcon />}
        triggerLabel={label}
        openOnHover
        placement="bottom-start"
      >
        <p>{info}</p>
      </Popover>
      {label}
    </span>
  );

  // The WHOLE shipment — header + every line, unpaginated — for the side
  // panel's copy action (controls § copy to clipboard; the fullStocktake
  // pattern). The detail's lines read is server-paged, so this is its own
  // one-shot fetch. A fetch failure is surfaced by graphqlFetch's global modal;
  // a NodeError (not expected from a screen showing the record) copies nothing.
  const loadFullShipment = async () => {
    const result = await graphqlFetch(FullOutbound, {
      storeId: props.storeId,
      id: props.node.id,
    });
    if (result.kind !== 'success') return undefined;
    if (result.data.invoice.__typename !== 'InvoiceNode') return undefined;
    // The node itself — the old app copies the record, not the query wrapper
    // ({"invoice": …}).
    return result.data.invoice;
  };

  return (
    <>
      {/* 1 — Additional info: entered by · created · picked date (backdating
          control, disabled with the reason outside its gate) · colour ·
          comment. */}
      <SidePanelSection
        value="additional-info"
        title={t('label.additional-info')}
        collapsible
      >
        <FieldRow label={t('label.entered-by')}>
          <span
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Text variant="body" as="span">
              {props.node.user?.username ?? '—'}
            </Text>
            {/* Info popover on hover — the user's email (the picked-date
                reason bubble's pattern); no icon when there is no email. */}
            <Show when={props.node.user?.email}>
              {email => (
                <Popover
                  trigger={<InfoIcon />}
                  triggerLabel={email()}
                  openOnHover
                  placement="top"
                >
                  <p>{email()}</p>
                </Popover>
              )}
            </Show>
          </span>
        </FieldRow>
        <FieldRow label={t('label.created')}>
          <Text variant="body">
            {localisedDate(props.node.createdDatetime)}
          </Text>
        </FieldRow>
        <FieldRow label={t('label.picked-date')}>
          {/* Backdating control (rules.md § backdating, AC-B1..B4): editable
              while NEW with the backdating preference on, otherwise disabled
              with the reason (pref off / past NEW). */}
          <PickedDateField
            storeId={props.storeId}
            node={props.node}
            disabled={props.disabled}
            onBackdate={backdatedDatetime =>
              props.onSaveField({ backdatedDatetime })
            }
          />
        </FieldRow>
        <FieldRow label={t('label.color')}>
          {/* Read-only once the shipment is (the panel-wide gate — "all
              inputs share the editability gate", spec S3): the dot replaces
              the picker, per the component's own read-only form. */}
          <Show
            when={!props.disabled}
            fallback={<ColourTagDot colour={props.node.colour ?? null} />}
          >
            <ColourTagPicker
              colour={props.node.colour ?? null}
              variant="field"
              onSelect={colour => props.onSaveField({ colour })}
            />
          </Show>
        </FieldRow>
        <FieldRow label={t('label.comment')}>
          <TextField
            label={t('label.comment')}
            hideLabel
            width="full"
            data-testid="comment-field"
            value={props.edit.state.comment}
            disabled={props.disabled}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      {/* 2 — Related documents: the originating customer requisition. */}
      <SidePanelSection
        value="related-documents"
        title={t('heading.related-documents')}
        collapsible
      >
        <Show
          when={requisition()}
          fallback={
            <Text variant="body">{t('messages.no-related-documents')}</Text>
          }
        >
          {req => (
            <Text variant="body">
              {/* The label is a hover popover explaining the document — the
                  old app's tooltip: "Customer requisition created on {date}
                  by {username}" (em dash for a requisition with no user, as
                  the old app shows). The label (not the whole entry) triggers
                  it because the Popover trigger is a button, and the entry's
                  number is a link — nesting one interactive in another is
                  invalid. */}
              <Popover
                trigger={t('label.requisition')}
                openOnHover
                placement="top"
              >
                <p>
                  {t('messages.customer-requisition-created-on', {
                    date: localisedDate(req().createdDatetime),
                  })}{' '}
                  {t('messages.by-user', {
                    username: req().user?.username ?? '—',
                  })}
                </p>
              </Popover>{' '}
              {/* Only the number is the link (old-app parity), targeting the
                  requisition's real record route with the requisition-kind
                  styling — the same pattern (and primary colour) as the
                  inbound side panel's internal-order link. The requisitions
                  vertical isn't built yet, so today this lands on the
                  not-found EntryPage; it goes live once that vertical
                  registers its routes (no change needed here). */}
              <A
                href={`/${props.storeId}/distribution/customer-requisition/${req().id}`}
                style={{ color: 'var(--primary-main)', 'font-weight': 500 }}
              >
                #{req().requisitionNumber}
              </A>
            </Text>
          )}
        </Show>
      </SidePanelSection>

      {/* 3 — Invoice details (rules.md § pricing; ui-surface S3 § side
          panel): service charges group · items sell price group · grand
          total · foreign currency. Disabled edit affordances stay visible,
          dimmed — never hidden. */}
      <SidePanelSection
        value="invoice-details"
        title={t('heading.invoice-details')}
        collapsible
      >
        {/* Service charges: info bubble + the S5 edit action (dimmed once
            read-only); one row per service line, then sub total / effective
            tax / total. Service tax is edited per line in S5. */}
        <FieldRow
          label={groupHeading(
            t('heading.service-charges'),
            t('messages.service-charges-description')
          )}
        >
          <IconButton
            bordered
            size="small"
            icon={<EditIcon />}
            label={t('messages.edit-service-charges')}
            data-testid="edit-service-charges-button"
            disabled={props.disabled}
            onClick={props.onEditServiceCharges}
          />
        </FieldRow>
        <For each={serviceLines()}>
          {line => (
            <FieldRow label={line.itemName}>
              <Text variant="body">{money(line.totalBeforeTax)}</Text>
            </FieldRow>
          )}
        </For>
        <FieldRow label={t('heading.sub-total')}>
          <Text variant="body">{money(pricing().serviceTotalBeforeTax)}</Text>
        </FieldRow>
        <FieldRow
          label={taxLabel(
            effectiveTaxPct(
              pricing().serviceTotalBeforeTax,
              pricing().serviceTotalAfterTax
            )
          )}
        >
          <Text variant="body">
            {money(
              taxAmount(
                pricing().serviceTotalBeforeTax,
                pricing().serviceTotalAfterTax
              )
            )}
          </Text>
        </FieldRow>
        <FieldRow label={t('label.total')}>
          <Text variant="body">{money(pricing().serviceTotalAfterTax)}</Text>
        </FieldRow>

        {/* Items sell price: info bubble; sub total / editable stored
            shipment tax (AC-T3 — the save cascades to every stock line
            server-side; disabled while read-only or while the stock total is
            zero) / total. */}
        <FieldRow
          label={groupHeading(
            t('heading.item-sell-price'),
            t('messages.stock-charges-description')
          )}
        >
          <span />
        </FieldRow>
        <FieldRow label={t('heading.sub-total')}>
          <Text variant="body">{money(pricing().stockTotalBeforeTax)}</Text>
        </FieldRow>
        <FieldRow label={taxLabel(pricing().taxPercentage ?? 0)}>
          <span
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: 'var(--space-2)',
            }}
          >
            <NumberField
              label={t('label.tax')}
              hideLabel
              size="small"
              min={0}
              max={100}
              decimalLimit={2}
              disabled={
                props.disabled || (pricing().stockTotalAfterTax ?? 0) === 0
              }
              value={pricing().taxPercentage ?? undefined}
              onChange={value =>
                props.onSaveField({ tax: { percentage: value ?? null } })
              }
            />
            <Text variant="body">
              {money(
                taxAmount(
                  pricing().stockTotalBeforeTax,
                  pricing().stockTotalAfterTax
                )
              )}
            </Text>
          </span>
        </FieldRow>
        <FieldRow label={t('label.total')}>
          <Text variant="body">{money(pricing().stockTotalAfterTax)}</Text>
        </FieldRow>

        <FieldRow
          // Bold like the group headings — the shipment-level summary row.
          label={
            <span style={{ 'font-weight': 'var(--weight-bold)' }}>
              {t('heading.grand-total')}
            </span>
          }
        >
          <Text variant="body">{money(pricing().totalAfterTax)}</Text>
        </FieldRow>

        {/* Foreign currency — always shown (rules.md § pricing): code · rate
            (a zero rate displays as 1) · total (dash until a real foreign
            currency is set). The change-currency control (currency + rate in
            one edit, ported from the inbound CurrencyModal) is gated by the
            issue-in-foreign-currency preference and the customer not being a
            store — by those gates ONLY, not by shipment status (spec S3 §
            side panel). */}
        <FieldRow label={t('heading.foreign-currency')}>
          <IconButton
            bordered
            size="small"
            icon={<EditIcon />}
            label={t('label.currency')}
            data-testid="change-currency-button"
            disabled={!canChangeCurrency()}
            onClick={() => setCurrencyOpen(true)}
          />
        </FieldRow>
        <FieldRow label={t('label.code')}>
          <Text variant="body">{props.node.currency?.code ?? ''}</Text>
        </FieldRow>
        <FieldRow label={t('heading.rate')}>
          <Text variant="body">
            {formatNumber(
              props.node.currencyRate === 0 ? 1 : props.node.currencyRate
            )}
          </Text>
        </FieldRow>
        <FieldRow label={t('label.total')}>
          <Text variant="body">
            {pricing().foreignCurrencyTotalAfterTax != null
              ? money(pricing().foreignCurrencyTotalAfterTax)
              : '—'}
          </Text>
        </FieldRow>
      </SidePanelSection>

      {/* 4 — Transport details: shipping method · expected delivery ·
          transport reference. */}
      <SidePanelSection
        value="transport-details"
        title={t('heading.transport-details')}
        collapsible
      >
        <FieldRow label={t('label.shipping-method')}>
          <ShippingMethodSelect
            label={t('label.shipping-method')}
            hideLabel
            disabled={props.disabled}
            value={props.node.shippingMethod?.id}
            placeholder={t('label.any')}
            onChange={method =>
              props.onSaveField({
                shippingMethodId: { value: method?.id ?? null },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t('label.expected-delivery-date')}>
          {/* The shared calendar-date input (ui-standards/inputs § dates &
              times); clearable — the wire value is nullable. */}
          <DateField
            label={t('label.expected-delivery-date')}
            hideLabel
            // Numeric day-first display/parse (27/07/2026) — matches the
            // panel's localisedDate renderings (created date etc.).
            format="dd/MM/yyyy"
            testId="expected-delivery-date-field"
            disabled={props.disabled}
            value={props.node.expectedDeliveryDate ?? null}
            onChange={value =>
              props.onSaveField({
                expectedDeliveryDate: { value },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t('label.reference')}>
          <TextField
            label={t('label.reference')}
            hideLabel
            width="full"
            data-testid="transport-reference-field"
            value={props.edit.state.transportReference}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('transportReference', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Record actions, pinned at the panel's end (spec S3 § record
          actions): Delete · Make a copy · Copy to clipboard — secondary-tone
          buttons, matching the stocktakes side panel. */}
      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          <DeleteShipmentAction
            shipmentId={props.node.id}
            disabled={!isDeletable(props.node.status)}
          />
          <DuplicateShipmentAction
            shipmentId={() => props.node.id}
            number={() => props.node.invoiceNumber}
            customerName={() => props.node.otherParty.name}
          />
          {/* Copy to clipboard — the shared control (controls § copy to
              clipboard): it owns the JSON serialisation and the in-place
              copied/failed feedback; this panel only supplies the record. */}
          <CopyToClipboardButton load={loadFullShipment} />
        </SidePanelActions>
      </SidePanelSection>
      {/* The shared change-currency modal with outbound's header update; a
          saved node replaces the entity in place. */}
      <CurrencyModal
        open={currencyOpen()}
        onClose={() => setCurrencyOpen(false)}
        initialCurrencyId={props.node.currency?.id}
        initialRate={props.node.currencyRate}
        save={async input => {
          const result = await changeShipmentCurrency(props.storeId, {
            id: props.node.id,
            ...input,
          });
          if (result.kind !== 'saved') return result;
          props.onSaved(result.node);
          return { kind: 'saved' };
        }}
      />
    </>
  );
};
