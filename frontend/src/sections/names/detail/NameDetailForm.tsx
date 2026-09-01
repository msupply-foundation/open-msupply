import { Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { RecordNameHeader } from '../../../ui/layout/Detail/RecordNameHeader';
import { EMPTY_FIELD_VALUE } from '../../../domain/customFields';
import { isStoreName, type NameDetail } from './nameDetail';

// The shared read-only detail FORM for both the customer modal (S3) and the
// supplier Details tab (S4) — one component, differing only by `role` (rules ›
// record detail). This vertical is read-only throughout, so it uses the
// SECTIONED FORM OF READ-ONLY LABELLED VALUES (spec/ui-standards/detail-views ›
// the read-only detail form, second presentation): a centred content measure,
// the record-name header, two column groups, then the full-width group. Every
// field is a labelled value with its label ABOVE it and NO input chrome —
// never a disabled control (spec D67): a greyed-out box reads as "editable but
// locked", inviting a click that does nothing, when nothing here is editable at
// all. Its two consequences are load-bearing and both live in the helpers
// below: an unset field shows a DASH (beside a label, blank reads as a
// rendering fault), and a flag reads YES/NO (a checkbox cannot tell `false`
// from never-set). Same composition as the sibling Custom fields tab
// (domain/customFields CustomFieldsView) and the items detail's General tab.

// A read-only value: itself, or a dash when unset. A real `0` is a VALUE and
// still renders "0".
const fieldValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === ''
    ? EMPTY_FIELD_VALUE
    : String(value);

// A never-editable flag reads as text, both states named.
const flagValue = (value: boolean): string =>
  value ? t('messages.yes') : t('messages.no');

export const NameDetailForm = (props: {
  name: NameDetail;
  role: 'customer' | 'supplier';
  /** Customer supply-level value (v1 name property); ignored for suppliers. */
  supplyLevel?: string;
  /**
   * Add the Page body's edge padding. Set by the routed page host (its Page is
   * `fillBody` for the table tabs, so the body carries no padding of its own);
   * the modal host leaves it off — the dialog body already pads.
   */
  padded?: boolean;
}): JSX.Element => {
  const n = () => props.name;
  const isSupplier = () => props.role === 'supplier';

  return (
    // The NARROW measure, not the two-column-form one. `--measure-form` (58rem)
    // is sized for columns of INPUTS; these are short labelled values, so at
    // that width each column carried ~270px of dead space and the two ink
    // blocks sat 456px apart — reading as two left-hugging clumps under a
    // centred heading rather than one centred block. At 40rem the columns are
    // ~280px, so the fields stay left-aligned in their column and the block
    // reads centred (Carl 2026-07-30).
    <ContentContainer size="prose" padded={props.padded}>
      {/* The form's block rhythm: header · columns · full-width group. */}
      <Stack gap="lg">
        <RecordNameHeader
          name={n().name}
          isStore={isStoreName(n())}
          storeLabel={t('name.store-indicator')}
        />

        {/* Two column groups (ui-surface S3/S4). Untitled — the spec gives this
            form no section headings — so each column stacks its fields
            directly; reading column 1 then column 2 preserves the spec's field
            order when the columns wrap to one. */}
        <FormColumns>
          {/* `minWidth` is the wrap threshold AND the shared flex basis, so it
              has to come down with the measure: the 22rem default wouldn't fit
              two columns in 40rem and they'd wrap to one stack immediately.
              15rem holds the longest label ("Address line 1") comfortably and
              still collapses to a single stack on a phone. */}
          <FormColumn minWidth="15rem">
            <Stack gap="md">
              <LabelledValue variant="field" label={t('name.column.code')}>
                {fieldValue(n().code)}
              </LabelledValue>
              <LabelledValue
                variant="field"
                label={t('name.detail.charge-code')}
              >
                {fieldValue(n().chargeCode)}
              </LabelledValue>
              <LabelledValue variant="field" label={t('name.detail.comment')}>
                {fieldValue(n().comment)}
              </LabelledValue>
              <LabelledValue variant="field" label={t('name.detail.phone')}>
                {fieldValue(n().phone)}
              </LabelledValue>
              {/* Supplier trade terms — interleaved into the two columns
                  (AC-N25), not gathered into a group of their own. */}
              <Show when={isSupplier()}>
                <LabelledValue
                  variant="field"
                  label={t('name.detail.hsh-code')}
                >
                  {fieldValue(n().hshCode)}
                </LabelledValue>
                <LabelledValue
                  variant="field"
                  label={t('name.detail.hsh-name')}
                >
                  {fieldValue(n().hshName)}
                </LabelledValue>
                <LabelledValue variant="field" label={t('name.detail.email')}>
                  {fieldValue(n().email)}
                </LabelledValue>
              </Show>
            </Stack>
          </FormColumn>

          <FormColumn minWidth="15rem">
            <Stack gap="md">
              <LabelledValue variant="field" label={t('name.detail.created')}>
                {n().createdDatetime
                  ? localisedDate(n().createdDatetime!)
                  : EMPTY_FIELD_VALUE}
              </LabelledValue>
              <LabelledValue
                variant="field"
                label={t('name.detail.manufacturer')}
              >
                {flagValue(n().isManufacturer)}
              </LabelledValue>
              <LabelledValue variant="field" label={t('name.detail.donor')}>
                {flagValue(n().isDonor)}
              </LabelledValue>
              <LabelledValue variant="field" label={t('name.detail.on-hold')}>
                {flagValue(n().isOnHold)}
              </LabelledValue>
              <Show when={isSupplier()}>
                <LabelledValue
                  variant="field"
                  label={t('name.detail.currency')}
                >
                  {fieldValue(n().currency?.code)}
                </LabelledValue>
                <LabelledValue variant="field" label={t('name.detail.margin')}>
                  {fieldValue(n().margin)}
                </LabelledValue>
                <LabelledValue
                  variant="field"
                  label={t('name.detail.freight-factor')}
                >
                  {fieldValue(n().freightFactor)}
                </LabelledValue>
              </Show>
            </Stack>
          </FormColumn>
        </FormColumns>

        {/* The full-width group below the columns: the long values, one per
            line, except the two address lines which pair on one row. */}
        <Stack gap="md">
          <FormRow>
            <LabelledValue variant="field" label={t('name.detail.address1')}>
              {fieldValue(n().address1)}
            </LabelledValue>
            <LabelledValue variant="field" label={t('name.detail.address2')}>
              {fieldValue(n().address2)}
            </LabelledValue>
          </FormRow>
          <LabelledValue variant="field" label={t('name.detail.country')}>
            {fieldValue(n().country)}
          </LabelledValue>
          <LabelledValue variant="field" label={t('name.detail.website')}>
            {/* A URL reads as a link opening a new context (registry › external
                link); no URL reads as the dash every other empty field shows. */}
            <Show when={n().website} fallback={EMPTY_FIELD_VALUE}>
              {website => (
                <a href={website()} target="_blank" rel="noopener noreferrer">
                  {website()}
                </a>
              )}
            </Show>
          </LabelledValue>
          {/* Customer-only supply level — a v1 name property (AC-N25). */}
          <Show when={!isSupplier()}>
            <LabelledValue
              variant="field"
              label={t('name.detail.supply-level')}
            >
              {fieldValue(props.supplyLevel)}
            </LabelledValue>
          </Show>
        </Stack>
      </Stack>
    </ContentContainer>
  );
};
