import {
  createResource,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { A } from '@solidjs/router';
import { t, localisedDate } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { homeCurrency } from '../../../intl/currency';
import { graphqlFetch } from '../../../api/graphql';
import {
  SidePanelSection,
  SidePanelActions,
} from '../../../ui/layout/SidePanel/SidePanel';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Button } from '../../../ui/elements/buttons/Button';
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { CopyIcon, EditIcon } from '../../../ui/icons';
import {
  InboundServiceLines,
  type InboundInfoFragment,
} from './inboundShipmentDetail.generated';
import type { UpdateInboundShipmentVariables } from './inboundShipmentDetail.generated';
import type { InboundFieldEdit } from './inboundShipmentEdit';
import { runInboundBatch } from './inboundShipmentUpdate';
import { kindOf, supplierIsStore } from './inboundShipmentStatus';
import { DeleteInboundShipmentAction } from './actions/DeleteInboundShipmentAction';
import { DuplicateInboundShipmentAction } from './actions/DuplicateInboundShipmentAction';
import { DefaultDonorModal } from './modals/DefaultDonorModal';
import { ServiceLineModal } from './modals/ServiceLineModal';
import { CurrencyModal } from './modals/CurrencyModal';
import { poLabel, ioLabel, PO_COLOUR, IO_COLOUR } from '../linkedOrder';

export interface InboundShipmentSidePanelProps {
  storeId: string;
  node: InboundInfoFragment;
  /** True once Verified (global edit lock). */
  disabled: boolean;
  isExternal: boolean;
  edit: InboundFieldEdit;
  /** Store gates for the donor section + foreign-currency change. */
  donorTracking: boolean;
  foreignCurrencyAllowed: boolean;
  onSaveField: (
    patch: Partial<Omit<UpdateInboundShipmentVariables['input'], 'id'>>
  ) => void;
  onSaved: (node: InboundInfoFragment) => void;
  /** A change that needs the header/pricing re-read (e.g. service charges). */
  onRefetch: () => void;
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

const round2 = (value: number): number => Math.round(value * 100) / 100;

// The inbound-shipment detail side panel (spec S3 → side panel): record
// actions, additional info (donor/edited-by/created/colour/comment), related
// documents, charges (stock/service/foreign-currency/grand total), and — for a
// transfer — read-only transport details.
export const InboundShipmentSidePanel: Component<
  InboundShipmentSidePanelProps
> = props => {
  const [donorOpen, setDonorOpen] = createSignal(false);
  const [serviceOpen, setServiceOpen] = createSignal(false);
  const [currencyOpen, setCurrencyOpen] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  // The itemised service lines feeding the Charges → Service charges block.
  // Re-read when the service-line modal saves or the service tax rate changes
  // (bump the version); pricing totals come from the node via onRefetch.
  const [serviceVersion, setServiceVersion] = createSignal(0);
  const [serviceLines] = createResource(serviceVersion, async () => {
    const result = await graphqlFetch(InboundServiceLines, {
      storeId: props.storeId,
      filter: {
        invoiceId: { equalTo: props.node.id },
        type: { equalTo: 'SERVICE' },
      },
    });
    return result.kind === 'success' &&
      result.data.invoiceLines.__typename === 'InvoiceLineConnector'
      ? result.data.invoiceLines.nodes
      : [];
  });
  const refreshService = () => {
    setServiceVersion(v => v + 1);
    props.onRefetch();
  };

  // Editing the service tax cascades one rate across every service line (the
  // per-line tax cascade — the update input's TaxInput wrapper), mirroring the
  // stock-tax cascade on the invoice.
  const setServiceTax = (percentage: number) => {
    const lines = serviceLines() ?? [];
    if (lines.length === 0) return;
    void runInboundBatch(props.storeId, props.isExternal, {
      updateInboundShipmentServiceLines: lines.map(line => ({
        id: line.id,
        tax: { percentage },
      })),
    }).then(refreshService);
  };

  // Change-currency is offered only when the store allows foreign currency and
  // the supplier isn't itself a store (spec S3 charges → foreign currency).
  const canChangeCurrency = () =>
    props.foreignCurrencyAllowed &&
    !supplierIsStore(props.node) &&
    !props.disabled;

  const copyToClipboard = () => {
    void navigator.clipboard
      .writeText(`#${props.node.invoiceNumber} — ${props.node.otherPartyName}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const pricing = () => props.node.pricing;
  const isTransfer = () => kindOf(props.node) === 'transfer';

  // Derived service tax rate (blended across lines) and amount — the display
  // side of the inline editor; both zero when there's nothing to tax.
  const serviceRate = () =>
    pricing().serviceTotalBeforeTax > 0
      ? round2(
          (pricing().serviceTotalAfterTax / pricing().serviceTotalBeforeTax -
            1) *
            100
        )
      : 0;

  return (
    <>
      {/* Additional info ---------------------------------------------------- */}
      <SidePanelSection title={t('heading.additional-info')}>
        <Show when={props.donorTracking}>
          <FieldRow label={t('label.donor')}>
            <span
              style={{
                display: 'inline-flex',
                gap: 'var(--space-2)',
                'align-items': 'center',
              }}
            >
              <span>{props.node.defaultDonor?.name ?? t('label.none')}</span>
              <Button
                variant="secondary"
                icon={<EditIcon />}
                disabled={props.disabled}
                data-testid="edit-donor-button"
                onClick={() => setDonorOpen(true)}
              >
                {t('label.edit')}
              </Button>
            </span>
          </FieldRow>
        </Show>
        <FieldRow label={t('label.edited-by')}>
          <span>{props.node.user?.username ?? '—'}</span>
        </FieldRow>
        <FieldRow label={t('label.created')}>
          <span>{localisedDate(props.node.createdDatetime)}</span>
        </FieldRow>
        <FieldRow label={t('label.colour')}>
          <ColourTagPicker
            colour={props.node.colour ?? null}
            onSelect={colour => props.onSaveField({ colour })}
          />
        </FieldRow>
        <FieldRow label={t('label.comment')}>
          <TextArea
            label={t('label.comment')}
            hideLabel
            width="full"
            value={props.edit.state.comment}
            disabled={props.disabled}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Related documents -------------------------------------------------- */}
      <SidePanelSection title={t('heading.related-documents')}>
        <Show
          when={props.node.purchaseOrder || props.node.requisition}
          fallback={<span>{t('messages.no-related-documents')}</span>}
        >
          {/* Same kind-coloured PO-/IO- link as the list (spec S1 column 4). */}
          <Show when={props.node.purchaseOrder}>
            {po => (
              <FieldRow label={t('label.purchase-order')}>
                <A
                  href={`/${props.storeId}/replenishment/purchase-order/${po().id}`}
                  style={{ color: PO_COLOUR, 'font-weight': 500 }}
                >
                  {poLabel(po().number)}
                </A>
              </FieldRow>
            )}
          </Show>
          <Show when={props.node.requisition}>
            {req => (
              <FieldRow label={t('internal-order')}>
                <A
                  href={`/${props.storeId}/replenishment/internal-order/${req().id}`}
                  style={{ color: IO_COLOUR, 'font-weight': 500 }}
                >
                  {ioLabel(req().requisitionNumber)}
                </A>
              </FieldRow>
            )}
          </Show>
        </Show>
      </SidePanelSection>

      {/* Charges ------------------------------------------------------------ */}
      <SidePanelSection title={t('heading.charges')}>
        {/* Stock charges: sub-total · tax (inline rate editor + amount, gated
            off when not editable or the stock sub-total is zero) · total. */}
        <FieldRow label={t('heading.stock-charges')}>
          <span />
        </FieldRow>
        <FieldRow label={t('label.sub-total')}>
          <span>{money(pricing().stockTotalBeforeTax)}</span>
        </FieldRow>
        <FieldRow label={t('label.tax')}>
          <span
            style={{
              display: 'inline-flex',
              gap: 'var(--space-2)',
              'align-items': 'center',
            }}
          >
            <NumberField
              label={t('label.tax')}
              hideLabel
              value={props.node.taxPercentage ?? 0}
              min={0}
              max={100}
              decimalLimit={2}
              endAdornment="%"
              disabled={props.disabled || pricing().stockTotalBeforeTax === 0}
              onChange={value =>
                props.onSaveField({ tax: { percentage: value ?? 0 } })
              }
            />
            <span>
              {money(
                pricing().stockTotalAfterTax - pricing().stockTotalBeforeTax
              )}
            </span>
          </span>
        </FieldRow>
        <FieldRow label={t('label.total')}>
          <span>{money(pricing().stockTotalAfterTax)}</span>
        </FieldRow>

        {/* Service charges: an edit action opens the service-line modal; an
            itemised list, then sub-total · tax (inline editor + amount) ·
            total (spec S3 charges → service charges). */}
        <FieldRow label={t('heading.service-charges')}>
          <Button
            variant="secondary"
            icon={<EditIcon />}
            disabled={props.disabled}
            data-testid="edit-service-charges-button"
            onClick={() => setServiceOpen(true)}
          >
            {t('label.edit')}
          </Button>
        </FieldRow>
        <For each={serviceLines() ?? []}>
          {line => (
            <FieldRow label={line.itemName}>
              <span>{money(line.totalBeforeTax)}</span>
            </FieldRow>
          )}
        </For>
        <FieldRow label={t('label.sub-total')}>
          <span>{money(pricing().serviceTotalBeforeTax)}</span>
        </FieldRow>
        <FieldRow label={t('label.tax')}>
          <span
            style={{
              display: 'inline-flex',
              gap: 'var(--space-2)',
              'align-items': 'center',
            }}
          >
            <NumberField
              label={t('label.tax')}
              hideLabel
              value={serviceRate()}
              min={0}
              max={100}
              decimalLimit={2}
              endAdornment="%"
              disabled={props.disabled || pricing().serviceTotalBeforeTax === 0}
              onChange={value => setServiceTax(value ?? 0)}
            />
            <span>
              {money(
                pricing().serviceTotalAfterTax - pricing().serviceTotalBeforeTax
              )}
            </span>
          </span>
        </FieldRow>
        <FieldRow label={t('label.total')}>
          <span>{money(pricing().serviceTotalAfterTax)}</span>
        </FieldRow>

        {/* Foreign currency — code/rate/converted total + the gated
            change-currency action (spec S3 charges → foreign currency). */}
        <FieldRow label={t('label.currency')}>
          <span
            style={{
              display: 'inline-flex',
              gap: 'var(--space-2)',
              'align-items': 'center',
            }}
          >
            <span>
              {props.node.currency?.code ?? '—'}
              <Show
                when={
                  props.node.currency && !props.node.currency.isHomeCurrency
                }
              >
                {' '}
                @ {props.node.currencyRate}
              </Show>
            </span>
            <Button
              variant="secondary"
              icon={<EditIcon />}
              disabled={!canChangeCurrency()}
              data-testid="change-currency-button"
              onClick={() => setCurrencyOpen(true)}
            >
              {t('label.edit')}
            </Button>
          </span>
        </FieldRow>
        <Show when={props.node.currency && !props.node.currency.isHomeCurrency}>
          <FieldRow label={t('label.foreign-currency-total')}>
            <span>{money(pricing().foreignCurrencyTotalAfterTax ?? 0)}</span>
          </FieldRow>
        </Show>

        <FieldRow label={t('heading.grand-total')}>
          <strong>{money(pricing().totalAfterTax)}</strong>
        </FieldRow>
      </SidePanelSection>

      {/* Transport details (transfers only, read-only) ---------------------- */}
      <Show when={isTransfer()}>
        <SidePanelSection title={t('heading.transport-details')}>
          <FieldRow label={t('label.shipping-method')}>
            <span>{props.node.shippingMethod?.method ?? '—'}</span>
          </FieldRow>
          <FieldRow label={t('label.expected-delivery-date')}>
            <span>
              {props.node.expectedDeliveryDate
                ? localisedDate(props.node.expectedDeliveryDate)
                : '—'}
            </span>
          </FieldRow>
          <FieldRow label={t('label.transport-reference')}>
            <span>{props.node.transportReference ?? '—'}</span>
          </FieldRow>
        </SidePanelSection>
      </Show>

      {/* Actions — the record-action cluster, its own titled section at the
          panel's end (spec S3 side panel → Actions), so it carries the same
          heading + padding as the info sections above. */}
      <SidePanelSection title={t('heading.actions')}>
        <SidePanelActions>
          {/* Delete only while New (client narrowing). */}
          <Show when={props.node.status === 'NEW'}>
            <DeleteInboundShipmentAction
              storeId={props.storeId}
              invoiceId={props.node.id}
              isExternal={props.isExternal}
              disabled={false}
              onDeleted={props.onDeleted}
            />
          </Show>
          <DuplicateInboundShipmentAction
            invoiceId={props.node.id}
            number={() => props.node.invoiceNumber}
            supplierName={() => props.node.otherPartyName}
          />
          <Button
            variant="secondary"
            icon={<CopyIcon />}
            data-testid="copy-to-clipboard-button"
            onClick={copyToClipboard}
          >
            {copied()
              ? t('message.copy-success')
              : t('button.copy-to-clipboard')}
          </Button>
        </SidePanelActions>
      </SidePanelSection>

      <DefaultDonorModal
        open={donorOpen()}
        onClose={() => setDonorOpen(false)}
        storeId={props.storeId}
        node={props.node}
        onSaved={props.onSaved}
      />
      <ServiceLineModal
        open={serviceOpen()}
        onClose={() => setServiceOpen(false)}
        storeId={props.storeId}
        invoiceId={props.node.id}
        isExternal={props.isExternal}
        disabled={props.disabled}
        onSaved={refreshService}
      />
      <CurrencyModal
        open={currencyOpen()}
        onClose={() => setCurrencyOpen(false)}
        storeId={props.storeId}
        node={props.node}
        onSaved={props.onSaved}
      />
    </>
  );
};
