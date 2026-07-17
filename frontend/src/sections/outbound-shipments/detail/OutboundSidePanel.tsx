import { createSignal, onCleanup, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import { SidePanelSection } from '../../../ui/layout/SidePanel/SidePanel';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import { Button } from '../../../ui/elements/buttons/Button';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { CopyIcon, EditIcon } from '../../../ui/icons';
import { ShippingMethodSelect } from '../../../domain/shippingMethod';
import { DeleteShipmentAction } from './actions';
import { DuplicateShipmentAction } from '../list/actions/DuplicateShipmentAction';
import { isDeletable } from '../outboundStatus';
import { outboundPrefs } from '../outboundPreferencesResource';
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
  const foreignCurrencyOn = () =>
    outboundPrefs()?.store.issueInForeignCurrency ?? false;
  const isTransfer = () => props.node.otherParty.store != null;

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
      `${t('outbound.column.status')}: ${node.status}`,
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
      <SidePanelSection title={t('outbound.panel.additional-info')}>
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
      <SidePanelSection title={t('outbound.panel.related-documents')}>
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

      {/* 3 — Invoice details: service charges block · items sell price block ·
          grand total · foreign currency. */}
      <SidePanelSection title={t('outbound.panel.invoice-details')}>
        <FieldRow label={t('outbound.panel.service-charges')}>
          <span
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Text variant="body">{money(pricing().serviceTotalAfterTax)}</Text>
            <IconButton
              bordered
              size="small"
              icon={<EditIcon />}
              label={t('outbound.panel.edit-service-charges')}
              data-testid="edit-service-charges-button"
              onClick={props.onEditServiceCharges}
            />
          </span>
        </FieldRow>
        <FieldRow label={t('outbound.panel.items-sell-price')}>
          <Text variant="body">{money(pricing().stockTotalAfterTax)}</Text>
        </FieldRow>
        <FieldRow label={t('outbound.panel.tax')}>
          {/* Editable shipment tax (AC-T3): committing a value recalculates
              every stock line's tax and after-tax totals server-side. */}
          <TextField
            label={t('outbound.panel.tax')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={props.disabled}
            value={pricing().taxPercentage ?? ''}
            onChange={e => {
              const raw = e.currentTarget.value;
              const parsed = raw === '' ? null : Number(raw);
              if (parsed == null || (Number.isFinite(parsed) && parsed >= 0))
                props.onSaveField({ tax: { percentage: parsed } });
            }}
          />
        </FieldRow>
        <FieldRow label={t('outbound.panel.grand-total')}>
          <Text variant="body">{money(pricing().totalAfterTax)}</Text>
        </FieldRow>
        {/* Foreign currency (rules.md § pricing): control enabled only for
            non-store customers with the issue-in-foreign-currency preference —
            display-only otherwise. */}
        <Show when={foreignCurrencyOn() && !isTransfer()}>
          <FieldRow label={t('outbound.panel.foreign-currency')}>
            <Text variant="body">
              {props.node.currency?.code ?? '—'} @{' '}
              {formatNumber(props.node.currencyRate)}
              {pricing().foreignCurrencyTotalAfterTax != null
                ? ` — ${money(pricing().foreignCurrencyTotalAfterTax)}`
                : ''}
            </Text>
          </FieldRow>
        </Show>
      </SidePanelSection>

      {/* 4 — Transport details: shipping method · expected delivery ·
          transport reference. */}
      <SidePanelSection title={t('outbound.panel.transport-details')}>
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
        <DeleteShipmentAction
          shipmentId={props.node.id}
          disabled={!isDeletable(props.node.status)}
        />
        <DuplicateShipmentAction shipmentId={() => props.node.id} />
        <Button
          variant="secondary"
          icon={<CopyIcon />}
          onClick={copyToClipboard}
        >
          {t('outbound.panel.copy-to-clipboard')}
        </Button>
        {/* role="status" so the confirmation is announced by assistive tech. */}
        <span role="status">
          <Show when={copied()}>
            <Text variant="bodySmall">{t('outbound.panel.copied')}</Text>
          </Show>
        </span>
      </SidePanelSection>
    </>
  );
};
