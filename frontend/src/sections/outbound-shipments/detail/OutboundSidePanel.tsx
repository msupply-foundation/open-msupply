import {
  createSignal,
  For,
  onCleanup,
  Show,
  type Component,
  type JSX,
} from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import {
  SidePanelActions,
  SidePanelSection,
} from '../../../ui/layout/SidePanel/SidePanel';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import { Button } from '../../../ui/elements/buttons/Button';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { Popover } from '../../../ui/elements/feedback/Popover';
import { CopyIcon, EditIcon, InfoIcon } from '../../../ui/icons';
import { ShippingMethodSelect } from '../../../domain/shippingMethod';
import { DeleteShipmentAction } from './actions';
import { DuplicateShipmentAction } from '../list/actions/DuplicateShipmentAction';
import { isDeletable, statusLabel } from '../outboundStatus';
import type { OutboundNode } from './outboundUpdate';
import type { OutboundFieldEdit } from './outboundEdit';

// The shipment side panel (spec S3 § side panel), sections top to bottom:
// Additional info · Related documents · Invoice details · Transport details,
// with the record actions pinned at the panel's end (SidePanel's convention).
// All inputs share the one editability gate (disabled prop).

export interface OutboundSidePanelProps {
  node: OutboundNode;
  disabled: boolean;
  /** The shared edit buffer (comment + transport reference live here). */
  edit: OutboundFieldEdit;
  /** Field saves that aren't buffered text (colour, expected date, method). */
  onSaveField: (patch: {
    colour?: string;
    tax?: { percentage: number | null };
    expectedDeliveryDate?: { value: string | null };
    shippingMethodId?: { value: string | null };
  }) => void;
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
  const serviceLines = () =>
    props.node.lines.nodes.filter(line => line.type === 'SERVICE');

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
  const taxLabel = (pct: number) =>
    `${t('outbound.panel.tax')} (${pct.toFixed(2)}%)`;

  const groupHeading = (label: string, info: string): JSX.Element => (
    <span
      style={{
        display: 'inline-flex',
        'align-items': 'center',
        gap: 'var(--space-1)',
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

  // Copy confirmation shown inline beside the button (controls › action
  // feedback — never a toast), fading after a moment.
  const [copied, setCopied] = createSignal(false);
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(copiedTimer));

  const copyToClipboard = () => {
    const node = props.node;
    const text = [
      `${t('nav.distribution.outbound-shipment')} #${node.invoiceNumber}`,
      `${t('outbound.toolbar.customer')}: ${node.otherParty.name}`,
      `${t('outbound.column.status')}: ${statusLabel(node.status)}`,
      `${t('outbound.panel.created')}: ${localisedDate(node.createdDatetime)}`,
      `${t('outbound.panel.grand-total')}: ${money(pricing().totalAfterTax)}`,
    ].join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <>
      {/* 1 — Additional info: entered by · created · picked date (backdating
          control, disabled with the reason outside its gate) · colour ·
          comment. */}
      <SidePanelSection title={t('outbound.panel.additional-info')} collapsible>
        <FieldRow label={t('outbound.panel.entered-by')}>
          <Text variant="body">{props.node.user?.username ?? '—'}</Text>
        </FieldRow>
        <FieldRow label={t('outbound.panel.created')}>
          <Text variant="body">
            {localisedDate(props.node.createdDatetime)}
          </Text>
        </FieldRow>
        <FieldRow label={t('outbound.panel.picked-date')}>
          {/* Backdating (rules.md § backdating) is preference-gated and NEW-
              only; the dev preference is off, so this build renders the value
              read-only — the control slots in here when the gate opens. */}
          <Text variant="body">
            {props.node.pickedDatetime
              ? localisedDate(props.node.pickedDatetime)
              : '—'}
          </Text>
        </FieldRow>
        <FieldRow label={t('outbound.panel.colour')}>
          <ColourTagPicker
            colour={props.node.colour ?? null}
            variant="field"
            onSelect={colour => props.onSaveField({ colour })}
          />
        </FieldRow>
        <FieldRow label={t('outbound.panel.comment')}>
          <TextField
            label={t('outbound.panel.comment')}
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
        title={t('outbound.panel.related-documents')}
        collapsible
      >
        <Show
          when={requisition()}
          fallback={
            <Text variant="body">
              {t('outbound.panel.no-related-documents')}
            </Text>
          }
        >
          {req => (
            <Text variant="body">
              {t('outbound.panel.requisition', {
                number: req().requisitionNumber,
              })}
            </Text>
          )}
        </Show>
      </SidePanelSection>

      {/* 3 — Invoice details (rules.md § pricing; ui-surface S3 § side
          panel): service charges group · items sell price group · grand
          total · foreign currency. Disabled edit affordances stay visible,
          dimmed — never hidden. */}
      <SidePanelSection title={t('outbound.panel.invoice-details')} collapsible>
        {/* Service charges: info bubble + the S5 edit action (dimmed once
            read-only); one row per service line, then sub total / effective
            tax / total. Service tax is edited per line in S5. */}
        <FieldRow
          label={groupHeading(
            t('outbound.panel.service-charges'),
            t('outbound.panel.service-charges-info')
          )}
        >
          <IconButton
            bordered
            size="small"
            icon={<EditIcon />}
            label={t('outbound.panel.edit-service-charges')}
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
        <FieldRow label={t('outbound.panel.sub-total')}>
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
        <FieldRow label={t('outbound.panel.total')}>
          <Text variant="body">{money(pricing().serviceTotalAfterTax)}</Text>
        </FieldRow>

        {/* Items sell price: info bubble; sub total / editable stored
            shipment tax (AC-T3 — the save cascades to every stock line
            server-side; disabled while read-only or while the stock total is
            zero) / total. */}
        <FieldRow
          label={groupHeading(
            t('outbound.panel.items-sell-price'),
            t('outbound.panel.items-sell-price-info')
          )}
        >
          <span />
        </FieldRow>
        <FieldRow label={t('outbound.panel.sub-total')}>
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
            <TextField
              label={t('outbound.panel.tax')}
              hideLabel
              size="small"
              type="number"
              min="0"
              max="100"
              step="0.01"
              disabled={
                props.disabled || (pricing().stockTotalAfterTax ?? 0) === 0
              }
              value={pricing().taxPercentage ?? ''}
              onChange={e => {
                const raw = e.currentTarget.value;
                const parsed = raw === '' ? null : Number(raw);
                if (
                  parsed == null ||
                  (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100)
                )
                  props.onSaveField({ tax: { percentage: parsed } });
              }}
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
        <FieldRow label={t('outbound.panel.total')}>
          <Text variant="body">{money(pricing().stockTotalAfterTax)}</Text>
        </FieldRow>

        <FieldRow label={t('outbound.panel.grand-total')}>
          <Text variant="body">{money(pricing().totalAfterTax)}</Text>
        </FieldRow>

        {/* Foreign currency — always shown (rules.md § pricing): code · rate
            (a zero rate displays as 1) · total (dash until a real foreign
            currency is set). The change-currency control is deferred with the
            FC preference — the dev store has it off, so it isn't built/
            verifiable yet (ui-surface § side panel notes this gap). */}
        <FieldRow label={t('outbound.panel.foreign-currency')}>
          <span />
        </FieldRow>
        <FieldRow label={t('outbound.panel.code')}>
          <Text variant="body">{props.node.currency?.code ?? ''}</Text>
        </FieldRow>
        <FieldRow label={t('outbound.panel.rate')}>
          <Text variant="body">
            {formatNumber(
              props.node.currencyRate === 0 ? 1 : props.node.currencyRate
            )}
          </Text>
        </FieldRow>
        <FieldRow label={t('outbound.panel.total')}>
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
        title={t('outbound.panel.transport-details')}
        collapsible
      >
        <FieldRow label={t('outbound.panel.shipping-method')}>
          <ShippingMethodSelect
            label={t('outbound.panel.shipping-method')}
            hideLabel
            disabled={props.disabled}
            value={props.node.shippingMethod?.id}
            placeholder={t('filter.any')}
            onChange={method =>
              props.onSaveField({
                shippingMethodId: { value: method?.id ?? null },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t('outbound.panel.expected-delivery')}>
          <TextField
            label={t('outbound.panel.expected-delivery')}
            hideLabel
            type="date"
            disabled={props.disabled}
            value={props.node.expectedDeliveryDate ?? ''}
            onInput={e =>
              props.onSaveField({
                expectedDeliveryDate: {
                  value: e.currentTarget.value || null,
                },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t('outbound.panel.reference')}>
          <TextField
            label={t('outbound.panel.reference')}
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
          actions): Delete · Make a copy · Copy to clipboard. */}
      <SidePanelSection title={t('common.action')}>
        <SidePanelActions>
          <DeleteShipmentAction
            shipmentId={props.node.id}
            disabled={!isDeletable(props.node.status)}
          />
          <DuplicateShipmentAction
            shipmentId={() => props.node.id}
            variant="panel"
          />
          <Button icon={<CopyIcon />} onClick={copyToClipboard}>
            {t('outbound.panel.copy-to-clipboard')}
          </Button>
          {/* role="status" so the confirmation is announced by assistive
              tech. */}
          <span role="status">
            <Show when={copied()}>
              <Text variant="bodySmall">{t('outbound.panel.copied')}</Text>
            </Show>
          </span>
        </SidePanelActions>
      </SidePanelSection>
    </>
  );
};
