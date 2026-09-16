import { createMemo, Show, type Component } from 'solid-js';
import { formatNumber, t } from '@/intl';
import { unitsToLens, type AllocateUnit } from '@/domain/allocation';
import { OkButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import {
  getExpiryDateCell,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { FormRow } from '@/ui/layout/Form/FormRow';
import { FormSection } from '@/ui/layout/Form/FormSection';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Text } from '@/ui/elements/typography/Text';
import { prescriptionPreferences } from '@/store/storeContext';
import { isBatchLine } from '../prescriptionStatus';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';
import {
  issuedUnitsOf,
  recordedDirections,
  recordedPrescribedQuantity,
} from './lineView';

type Line = PrescriptionFieldsFragment['lines']['nodes'][number];

export interface PrescriptionLineViewModalProps {
  /**
   * EVERY line the prescription holds for the opened item — placeholders
   * included: the prescribed quantity and the directions are set-saved across
   * the item and may sit on a line the batch table never shows (see
   * ./lineView).
   */
  lines: Line[];
  onClose: () => void;
}

/*
 * S4's read-only face (spec/prescriptions/ui-surface.md § read-only face,
 * OMS-REG-DIS-03.73): what an item was dispensed with, opened by selecting a
 * line row once the prescription is read-only (VERIFIED / CANCELLED). The
 * editor's sections — item, quantity, batches, directions — with every
 * control replaced by its VALUE (kdd/form-layout: read-only-vs-editable reads
 * from the absent input box, never a greyed field), and no edit affordance to
 * hide.
 *
 * It fetches NOTHING: the detail read already carries every field shown here,
 * so the caller hands over the item's lines and the modal opens instantly —
 * no resource, and so nothing that could suspend the open screen
 * (kdd/solid-reactivity-pitfalls).
 */
export const PrescriptionLineViewModal: Component<
  PrescriptionLineViewModalProps
> = props => {
  const prefs = prescriptionPreferences;

  const first = () => props.lines[0];
  const item = () => first()?.item;

  // The batch rows: what this item was dispensed from. A cancellation
  // reversal's returned lines are its rows, as in the line table — but the
  // prescribed-quantity placeholder is NOT one (isBatchLine, not
  // isRenderableLine): it has no stock line, so an item with only a
  // placeholder has no batches and the section doesn't render at all.
  const batches = createMemo(() => props.lines.filter(isBatchLine));

  const unitName = () => item()?.unitName ?? t('label.unit');
  const dosesPerUnit = () => Math.max(item()?.doses ?? 1, 1);
  // The lens the editor would OPEN in for this item (.63) — fixed here, since
  // nothing is being entered there is no lens control to flip.
  const dosesMode = () =>
    (item()?.isVaccine ?? false) && prefs().manageVaccinesInDoses;
  const lens = (): AllocateUnit =>
    dosesMode()
      ? { kind: 'doses', dosesPerUnit: dosesPerUnit() }
      : { kind: 'units' };
  const inLens = (units: number) => formatNumber(unitsToLens(units, lens()));

  const issued = () => issuedUnitsOf(props.lines);
  const prescribed = () => recordedPrescribedQuantity(props.lines);
  const directions = () => recordedDirections(props.lines);

  /**
   * The issued figure names the lens it reads in. The editor can leave this to
   * its lens Select; with no lens control here, the label carries it.
   */
  const quantityUnit = () => (dosesMode() ? t('label.doses') : unitName());

  // The editor's batch grid MINUS its dispensing-decision columns (in stock,
  // available, on hold — a record has no decision to make). Location is left
  // to the detail line table, which already carries it: here it would only
  // push the issued figure off the card.
  const columns = (): Column<Line, never>[] => {
    const cols: Column<Line, never>[] = [
      { c: { key: 'batch' }, header: () => t('label.batch') },
      {
        c: { key: 'expiryDate' },
        header: () => t('label.expiry'),
        ...getExpiryDateCell(),
      },
    ];
    if (dosesMode())
      cols.push({
        c: { accessor: () => dosesPerUnit(), id: 'dosesPerUnit' },
        header: () => t('label.doses-per-unit'),
        ...getNumberCell(),
      });
    else
      cols.push({
        c: { key: 'packSize' },
        header: () => t('label.pack-size'),
        ...getNumberCell(),
      });
    cols.push({
      c: {
        accessor: line => line.numberOfPacks * line.packSize,
        id: 'unitsIssued',
      },
      header: () => t('label.units-issued', { unit: unitName() }),
      ...getNumberCell(),
    });
    return cols;
  };

  return (
    <Dialog
      open
      // Sizes to its content, unlike the editor's sheet: a record is a handful
      // of values and a batch row or two, and the workbench sizes' 60vh floor
      // would push the directions — the reason the line was opened — below the
      // fold. Wide enough for the batch table's five columns.
      size="auto"
      widthRem={52}
      onClose={props.onClose}
      testId="view-item-modal"
      title={t('heading.view-line')}
      // Nothing here saves, so the footer is the acknowledgement shape — one
      // button, no Cancel beside it (ui-standards › controls § dialog chrome),
      // the same OK the history modal closes with.
      actions={
        <OkButton data-testid="dialog-button-ok" onClick={props.onClose} />
      }
    >
      {/* The editor's three sections, in its order — so a dispenser who knows
          the editor reads this without relearning it. A section holding ONE
          value takes no field label: the group heading already names it, and
          "Item / Item" reads as a bug. Only Quantity carries labels, because
          its two figures need telling apart. */}
      <FormSection title={t('label.item')} headingLevel="h3" heading="group">
        <Text variant="body" data-testid="item-value">
          {`${first()?.itemCode ?? ''} - ${first()?.itemName ?? ''}`}
        </Text>
      </FormSection>

      <FormSection
        title={t('label.quantity')}
        headingLevel="h3"
        heading="group"
      >
        {/* The two figures ride one wrapping row, as the editor's quantity
            fields do — prescribed first (.61). */}
        <FormRow>
          <Show when={prefs().editPrescribedQuantity}>
            <LabelledValue
              label={t('label.prescribed-quantity')}
              variant="field"
              data-testid="prescribed-quantity-value"
            >
              {/* A recorded zero is a figure; an unrecorded one is a dash. */}
              {prescribed() == null ? '—' : inLens(prescribed() ?? 0)}
            </LabelledValue>
          </Show>
          <LabelledValue
            label={t('label.units-issued', { unit: quantityUnit() })}
            variant="field"
            data-testid="units-issued-value"
          >
            {inLens(issued())}
          </LabelledValue>
        </FormRow>
      </FormSection>

      {/* Listed directly — the editor's disclosure keeps an ENTRY surface
          short, and nothing is entered here. */}
      <Show when={batches().length > 0}>
        <FormSection
          title={t('label.batches')}
          headingLevel="h3"
          heading="group"
        >
          <DataTable
            columns={columns()}
            rows={batches()}
            rowKey={line => line.id}
            showFullScreen={false}
          />
        </FormSection>
      </Show>

      <FormSection
        title={t('label.directions')}
        headingLevel="h3"
        heading="group"
      >
        <Text variant="body" data-testid="directions-value">
          {directions() ?? '—'}
        </Text>
      </FormSection>
    </Dialog>
  );
};
