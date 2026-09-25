import { For, Show, type Component } from 'solid-js';
import { t, localisedDate } from '@/intl';
import { formatCurrency } from '@/intl/currency';
import {
  SidePanelSection,
  SidePanelActions,
} from '@/ui/layout/SidePanel/SidePanel';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { Text } from '@/ui/elements/typography/Text';
import { UserLabel } from '@/ui/elements/typography/UserLabel';
import { RecordLink } from '@/ui/elements/typography/RecordLink';
import { Popover } from '@/ui/elements/feedback/Popover';
import { CopyToClipboardButton } from '@/ui/elements/buttons/CopyToClipboardButton';
import {
  ColourTagDot,
  ColourTagPicker,
} from '@/ui/elements/selectors/ColourTag';
import { type DebouncedEdit } from '@/domain/debouncedEdit';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';
import { type HeaderEditFields } from './RequisitionToolbar';

// The requisition detail side panel (spec/requisitions S5). Sections, in
// order: Program info (program requisitions only) · Additional info
// (entered-by / created / colour / comment) · Related documents (fulfilling
// outbound shipments) · Pricing (the indicative grand total, gated). Actions:
// Copy to clipboard only — unlike an internal order's panel there is NO Delete
// (requisitions are deleted from the list only, rules › deletion). The two
// editable fields — colour and comment — are disabled off the editability
// gate; the reads show on every status.

export interface RequisitionSidePanelProps {
  storeId: string;
  node: RequisitionInfoFragment;
  editable: boolean;
  isProgram: boolean;
  /** Indicative-pricing preference on → the Pricing grand total. */
  showPricing: boolean;
  /**
   * The shared header edit buffer (comment rides it, as theirReference does).
   */
  edit: DebouncedEdit<HeaderEditFields>;
  /** Colour save (the buffered comment saves through the buffer itself). */
  onSaveField: (patch: Record<string, unknown>) => void;
}

export const RequisitionSidePanel: Component<
  RequisitionSidePanelProps
> = props => {
  // The grand total (rules › pricing): Σ captured price × SUPPLY quantity —
  // this side prices what the store intends to send; priceless lines
  // contribute zero. Over the node's unpaginated lines connection (the full
  // set — contract › pricing).
  const grandTotal = () =>
    props.node.lines.nodes.reduce(
      (sum, line) => sum + (line.pricePerUnit ?? 0) * line.supplyQuantity,
      0
    );

  // The shipment row's hover annotation — created date + by whom (a missing
  // user shown as a dash; rules › related documents).
  const shipmentTooltip = (createdDatetime: string, username?: string) =>
    `${t('messages.outbound-shipment-created-on', {
      date: localisedDate(createdDatetime),
    })} ${t('messages.by-user', { username: username ?? '—' })}`;

  return (
    <>
      {/* Program info — program requisitions only, read-only. */}
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
            <span>{props.node.programName ?? '—'}</span>
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
          {/* The picker while editable, read-only otherwise (AC-T1). */}
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

      {/* Related documents — one row per fulfilling outbound shipment,
          whatever its progress (rules › related documents). The linked
          internal order of a transfer is NOT listed (captured as-is). */}
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
                    whom annotation — a real popover, not a native `title`, so
                    it also opens on keyboard focus. The label (not the entry)
                    triggers it because the number is itself a link — nesting
                    one interactive in another is invalid. */}
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
                  testId="fulfilling-shipment-link"
                  href={`/${props.storeId}/distribution/outbound-shipment/${shipment.id}`}
                >
                  {`#${shipment.invoiceNumber}`}
                </RecordLink>
              </Text>
            )}
          </For>
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
              {formatCurrency(grandTotal())}
            </strong>
          </FieldRow>
        </SidePanelSection>
      </Show>

      {/* Actions — Copy to clipboard only (no Delete on this panel; rules ›
          deletion). Always enabled, whatever the status (rules › copy). No
          extra fetch: the detail node already carries the header, the
          UNPAGINATED lines connector, and the linked references (contract §
          copy to clipboard), serialised with 4-space indentation. */}
      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          <CopyToClipboardButton load={() => props.node} indent={4} />
        </SidePanelActions>
      </SidePanelSection>
    </>
  );
};
