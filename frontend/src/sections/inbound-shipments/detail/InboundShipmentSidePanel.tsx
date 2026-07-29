import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
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
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { EditIcon } from '../../../ui/icons';
import {
  FullInboundShipment,
  InboundServiceLines,
  type InboundInfoFragment,
} from './inboundShipmentDetail.generated';
import type { UpdateInboundShipmentVariables } from './inboundShipmentDetail.generated';
import type { InboundFieldEdit } from './inboundShipmentEdit';
import {
  runInboundBatch,
  updateInboundShipment,
} from './inboundShipmentUpdate';
import { kindOf, supplierIsStore } from './inboundShipmentStatus';
import { isExternalScope, type InboundScope } from '../inboundShipmentScope';
import { DeleteInboundShipmentAction } from './actions/DeleteInboundShipmentAction';
import { DuplicateInboundShipmentAction } from './actions/DuplicateInboundShipmentAction';
import { DefaultDonorModal } from './modals/DefaultDonorModal';
import { CurrencyModal, ServiceChargesModal } from '../../../domain/invoice';
import {
  fetchInboundServiceCharges,
  saveInboundServiceCharges,
} from './modals/inboundServiceCharges';
import { poLabel, ioLabel } from '../linkedOrder';
import { RecordLink } from '../../../ui/elements/typography/RecordLink';

export interface InboundShipmentSidePanelProps {
  storeId: string;
  node: InboundInfoFragment;
  /**
   * Whether the details panel is actually SHOWING. The Page frame keeps panel
   * content mounted and merely parks it off-frame while closed (so panel state
   * survives open/close — kdd/state-management → no remounts), which means a
   * resource created here would otherwise fetch on every detail load even for a
   * panel nobody opened. The service-charge lines arm their fetch on this.
   */
  open: boolean;
  /** True once Verified (global edit lock). */
  disabled: boolean;
  /**
   * The shipment's permission scope, from the route (see
   * inboundShipmentScope). Selects `type` on the whole-shipment copy read and
   * the plain-vs-`...External` mutation twins below.
   */
  scope: InboundScope;
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

  // Which mutation twin the scope's writes go through (plain vs `...External`).
  const isExternal = () => isExternalScope(props.scope);

  // The itemised service lines feeding the Charges → Service charges block.
  // Re-read when the service-line modal saves or the service tax rate changes
  // (bump the version); pricing totals come from the node via onRefetch.
  //
  // Fetched on the FIRST open of the panel, then held (kdd/state-management →
  // data needed only sometimes). The Page frame keeps this content mounted and
  // merely parks it off-frame while closed, so without the latch every detail
  // load would pay for a query nobody looked at. The latch never lowers:
  // closing the panel is not a refresh gesture, and every edit that can change
  // these lines already bumps the version below, so a re-read on reopen would
  // buy nothing. `undefined` disables the fetch; `0` is a legitimate version.
  const [serviceVersion, setServiceVersion] = createSignal(0);
  const everOpened = createMemo(prev => prev || props.open, false);
  const [serviceLines] = createResource(
    () => (everOpened() ? serviceVersion() : undefined),
    async () => {
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
    }
  );
  // Non-suspending read — the binding read-safety gate (kdd/solid-reactivity-
  // pitfalls → No remounts on interaction). This refetches WHILE the screen
  // stays open (a committed charges batch, and the tax cascade below fired from
  // a focused field), and first-fetches on the interaction that opens the panel
  // — a direct `serviceLines()` read would suspend the detail view's boundary
  // each time, unmounting the panel's own focused tax input.
  const serviceLineRows = () =>
    serviceLines.state === 'ready' || serviceLines.state === 'refreshing'
      ? (serviceLines.latest ?? [])
      : [];
  const refreshService = () => {
    setServiceVersion(v => v + 1);
    props.onRefetch();
  };

  // Editing the service tax cascades one rate across every service line (the
  // per-line tax cascade — the update input's TaxInput wrapper), mirroring the
  // stock-tax cascade on the invoice.
  const setServiceTax = (percentage: number) => {
    const lines = serviceLineRows();
    if (lines.length === 0) return;
    void runInboundBatch(props.storeId, isExternal(), {
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

  // The WHOLE shipment — header + every line, stock-in and service alike,
  // unpaginated — for the copy action (rules § copy to clipboard, case .34).
  // The detail's own lines read is server-paged and excludes SERVICE rows, so
  // this is its own one-shot fetch through the FullInboundShipment query;
  // `type` is the shipment's own permission scope, the one the route carries.
  // A fetch failure routes to the global error modal; a NodeError (not expected
  // from a screen showing the record) copies nothing.
  const loadFullShipment = async () => {
    const result = await graphqlFetch(FullInboundShipment, {
      storeId: props.storeId,
      id: props.node.id,
      type: props.scope,
    });
    if (result.kind !== 'success') return undefined;
    if (result.data.invoice.__typename !== 'InvoiceNode') return undefined;
    // The node itself — the record, not the query wrapper ({"invoice": …}).
    return result.data.invoice;
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
      <SidePanelSection
        value="additional-info"
        title={t('heading.additional-info')}
        collapsible
      >
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
            data-testid="comment-field"
            value={props.edit.state.comment}
            disabled={props.disabled}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Related documents -------------------------------------------------- */}
      <SidePanelSection
        value="related-documents"
        title={t('heading.related-documents')}
        collapsible
      >
        <Show
          when={props.node.purchaseOrder || props.node.requisition}
          fallback={<span>{t('messages.no-related-documents')}</span>}
        >
          {/* Same kind-coloured PO-/IO- link as the list (spec S1 column 4). */}
          <Show when={props.node.purchaseOrder}>
            {po => (
              <FieldRow label={t('label.purchase-order')}>
                <RecordLink
                  href={`/${props.storeId}/replenishment/purchase-order/${po().id}`}
                  kind="po"
                >
                  {poLabel(po().number)}
                </RecordLink>
              </FieldRow>
            )}
          </Show>
          <Show when={props.node.requisition}>
            {req => (
              <FieldRow label={t('internal-order')}>
                <RecordLink
                  href={`/${props.storeId}/replenishment/internal-order/${req().id}`}
                  kind="io"
                >
                  {ioLabel(req().requisitionNumber)}
                </RecordLink>
              </FieldRow>
            )}
          </Show>
        </Show>
      </SidePanelSection>

      {/* Charges ------------------------------------------------------------ */}
      <SidePanelSection
        value="charges"
        title={t('heading.charges')}
        collapsible
      >
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
        <For each={serviceLineRows()}>
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
        <SidePanelSection
          value="transport-details"
          title={t('heading.transport-details')}
          collapsible
        >
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
      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          {/* Delete only while New (client narrowing). */}
          <Show when={props.node.status === 'NEW'}>
            <DeleteInboundShipmentAction
              storeId={props.storeId}
              invoiceId={props.node.id}
              isExternal={isExternal()}
              number={() => props.node.invoiceNumber}
              disabled={false}
              onDeleted={props.onDeleted}
            />
          </Show>
          <DuplicateInboundShipmentAction
            invoiceId={props.node.id}
            number={() => props.node.invoiceNumber}
            supplierName={() => props.node.otherPartyName}
          />
          {/* Copy to clipboard — the shared control (controls § copy to
              clipboard): it owns the JSON serialisation and the in-place
              copied/failed feedback; this panel only supplies the record. */}
          <CopyToClipboardButton load={loadFullShipment} />
        </SidePanelActions>
      </SidePanelSection>

      <DefaultDonorModal
        open={donorOpen()}
        onClose={() => setDonorOpen(false)}
        storeId={props.storeId}
        node={props.node}
        isExternal={isExternal()}
        onSaved={props.onSaved}
      />
      {/* The shared service-charges editor (spec S6) with inbound's wire
          twins (plain vs external batch); a committed batch re-reads the
          charges block. */}
      <ServiceChargesModal
        open={serviceOpen()}
        onClose={() => setServiceOpen(false)}
        storeId={props.storeId}
        disabled={props.disabled}
        fetchCharges={() =>
          fetchInboundServiceCharges(props.storeId, props.node.id)
        }
        save={async batch => {
          const result = await saveInboundServiceCharges(
            props.storeId,
            isExternal(),
            props.node.id,
            batch
          );
          if (result.ok) refreshService();
          return result;
        }}
      />
      {/* The shared change-currency modal with inbound's header update; a
          saved node replaces the entity in place. */}
      <CurrencyModal
        open={currencyOpen()}
        onClose={() => setCurrencyOpen(false)}
        initialCurrencyId={props.node.currency?.id}
        initialRate={props.node.currencyRate}
        save={async input => {
          const result = await updateInboundShipment(
            props.storeId,
            isExternal(),
            { id: props.node.id, ...input }
          );
          if (result.kind !== 'saved') return result;
          props.onSaved(result.node);
          return { kind: 'saved' };
        }}
      />
    </>
  );
};
