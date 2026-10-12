/*
 * The form library's prescription control (remaining work item 23): the old
 * client's `Prescription` control, which gives the patient stock from inside
 * a program form (a reproductive health encounter's contraceptive method).
 * Built on the SDK's prescription data functions and the core library.
 *
 * Until the record's prescription is written: an item search, limited to one
 * category when the form names one (the method chosen), then the item's
 * batches with a quantity to give from each, in units. Picking an item writes
 * a new prescription id at the control's path, the one value it stores, as
 * the old client does. The prescription itself is written just before the
 * record is saved, through the form's participation: it is created for the
 * patient with the batches given (those left at zero are left out) and
 * marked picked, and a failure stops the save with its message. Nothing is
 * written when no quantity was entered. Changing the category before then
 * drops the picked item.
 *
 * Once the prescription exists: what it gave and when, with a link to it when
 * it was made in this store.
 */
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  type JSX,
} from 'solid-js';
import { formatNumber, localisedDate, t } from '../../intl';
import { Alert } from '../../ui/elements/feedback/Alert';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { Table } from '../../ui/elements/table/Table';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import { HStack } from '../../ui/layout/Stack/HStack';
import { Stack } from '../../ui/layout/Stack/Stack';
import { generateUUID } from '../../uuid';
import { currentStoreId } from '../../store/storeContext';
import { prescriptionDetailPath } from '../../plugin-sdk/deepLinks';
import {
  createPrescription,
  useItemBatches,
  usePrescriptionSummary,
} from '../../plugin-sdk/prescriptions';
import { RecordLink } from '../../plugin-sdk/recordLink';
import type { FormParticipation } from '../../plugin-sdk/types';
import { ItemSearch } from '../item/ItemSearch';
import type { ItemOption } from '../item/itemResource';
import type { Draft } from './draft';
import type { TextPath } from './paths';

export interface PrescriptionInputProps<T, P extends TextPath<T>> {
  draft: Draft<T>;
  /** The form's participation in the record's save, from its slot props. */
  form: FormParticipation;
  /** Where the prescription's id is stored. */
  path: P;
  /** The patient the prescription is for. */
  patientId: string;
  /**
   * Offer only the items of this category, by name (the old client's
   * `itemCategoryPath`, read by the form). Every item when undefined.
   */
  itemCategoryName?: string;
  /** `data-testid` prefix for the control's parts (e2e/TESTIDS.md). */
  testId?: string;
}

interface UntypedIdDraft {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  readOnly(): boolean;
}

export const PrescriptionInput = <T, P extends TextPath<T>>(
  props: PrescriptionInputProps<T, P>
): JSX.Element => {
  const d = () => props.draft as unknown as UntypedIdDraft;
  const prescriptionId = () => {
    const id = d().get(props.path);
    return typeof id === 'string' && id !== '' ? id : undefined;
  };
  const summary = usePrescriptionSummary(prescriptionId);

  const [item, setItem] = createSignal<ItemOption>();
  // Units to give from each batch, by stock line id.
  const [units, setUnits] = createSignal<Record<string, number>>({});
  const batches = useItemBatches(() => item()?.id);

  const clear = () => {
    setItem(undefined);
    setUnits({});
    props.form.setDirty(false);
  };
  // A new category, or the id cleared (the edits discarded), starts again.
  createEffect(
    on(
      () => props.itemCategoryName,
      () => {
        if (!summary.data()) clear();
      },
      { defer: true }
    )
  );
  createEffect(
    on(prescriptionId, id => {
      if (id === undefined) clear();
    })
  );

  /*
   * The item search, once per category: it keeps the first page of results
   * it fetched for as long as it is mounted (its search starts again only
   * after something was typed), so a new category needs a new search. The
   * remount takes nothing live with it: the method was chosen in another
   * field, and the item picked for the old category is dropped anyway (the
   * effect above). TO-DO: an AsyncCombobox option to refetch when its query's
   * filters change, which would let the search stay mounted.
   */
  const searchFor = createMemo(() => ({ category: props.itemCategoryName }));

  const pick = (picked: ItemOption | null) => {
    if (!picked) {
      clear();
      return;
    }
    setItem(picked);
    setUnits({});
    d().set(props.path, generateUUID());
  };

  const packsToGive = () =>
    (batches.data() ?? []).flatMap(batch => {
      const given = units()[batch.id] ?? 0;
      return given > 0
        ? [{ stockLineId: batch.id, numberOfPacks: given / batch.packSize }]
        : [];
    });

  /*
   * solid/reactivity is disabled for the registration below, as the CIV
   * payment form disables it for its own: the handlers are callbacks the host
   * runs during the save, and reading the signals at that moment is the point.
   * `form` is one stable object for the form's life.
   */
  /* eslint-disable solid/reactivity */
  props.form.onBeforeSave(async () => {
    const id = prescriptionId();
    const chosen = item();
    const lines = packsToGive();
    if (!id || !chosen || lines.length === 0 || summary.data()) return;
    const result = await createPrescription({
      id,
      patientId: props.patientId,
      itemId: chosen.id,
      lines,
    });
    if (result.kind === 'failed') throw new Error(result.message);
  });
  props.form.onAfterSave(() => {
    // What was entered is saved, or written as the prescription.
    props.form.setDirty(false);
    if (item()) summary.refetch();
  });
  /* eslint-enable solid/reactivity */

  const given = () => {
    const written = summary.data();
    const line = written?.lines[0];
    if (!written || !line) return undefined;
    return t('messages.prescription-given', {
      item: line.itemName,
      amount: formatNumber(line.units),
      date: localisedDate(written.createdDatetime),
    });
  };

  // A record that names a prescription shows nothing until the read says
  // whether it has been written, rather than the search for a moment.
  const settled = () => !(summary.loading() && !summary.data() && !item());

  return (
    <Show when={settled()}>
      <Show
        when={summary.data()}
        fallback={
          <Stack>
            <Show when={searchFor()} keyed>
              {query => (
                <ItemSearch
                  label={t('label.create-prescription')}
                  storeId={currentStoreId() ?? ''}
                  categoryName={query.category}
                  value={item()?.id}
                  selectedItem={item()}
                  onSelect={pick}
                  disabled={d().readOnly()}
                />
              )}
            </Show>
            <Show when={item()}>
              {chosen => (
                <Stack>
                  <Alert severity="info">
                    {t('messages.prescription-will-be-created')}
                  </Alert>
                  <LabelledValue label={t('label.item')} variant="field">
                    {chosen().name}
                  </LabelledValue>
                  <Table label={chosen().name} density="comfortable">
                    <thead>
                      <tr>
                        <th>{t('label.expiry')}</th>
                        <th>{t('label.batch')}</th>
                        <th data-numeric>{t('label.available-units')}</th>
                        <th data-numeric data-control>
                          {t('label.issued')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={batches.data() ?? []}>
                        {batch => (
                          <tr
                            data-testid={
                              props.testId
                                ? `${props.testId}-batch-${batch.id}`
                                : undefined
                            }
                          >
                            <td>
                              {batch.expiryDate
                                ? localisedDate(batch.expiryDate)
                                : ''}
                            </td>
                            <td>{batch.batch ?? ''}</td>
                            <td data-numeric>
                              {formatNumber(
                                batch.availablePacks * batch.packSize
                              )}
                            </td>
                            <td data-control>
                              <NumberField
                                label={`${batch.batch ?? ''} ${t('label.issued')}`}
                                hideLabel
                                size="small"
                                min={0}
                                max={batch.availablePacks * batch.packSize}
                                value={units()[batch.id]}
                                disabled={d().readOnly()}
                                onChange={value => {
                                  setUnits(all => ({
                                    ...all,
                                    [batch.id]: value ?? 0,
                                  }));
                                  props.form.setDirty(
                                    Object.values(units()).some(u => u > 0)
                                  );
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </Table>
                </Stack>
              )}
            </Show>
          </Stack>
        }
      >
        {written => (
          <Alert severity="success">
            <HStack justify="between" wrap>
              <span>{given()}</span>
              <Show when={written().madeHere}>
                <RecordLink
                  path={prescriptionDetailPath(written().id)}
                  testId={props.testId ? `${props.testId}-link` : undefined}
                >
                  {t('button.view-prescription')}
                </RecordLink>
              </Show>
            </HStack>
          </Alert>
        )}
      </Show>
    </Show>
  );
};
