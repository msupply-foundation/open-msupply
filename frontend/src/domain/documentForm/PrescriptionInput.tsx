/*
 * The form library's prescription control: the old client's `Prescription`
 * control, which gives the patient stock from inside a program form (a
 * reproductive health encounter's contraceptive method). Built on the SDK's
 * prescription data functions and the core library.
 *
 * While the record names no prescription: an item search, limited to one
 * category when the form names one (the method chosen), then the item's
 * batches with a quantity to give from each, in units. The prescription is
 * written just before the record is saved, through the form's participation:
 * it is created for the patient with the batches given (those left at zero
 * are left out) and marked picked, and a failure stops the save with its
 * message. Only once it is written does its id go to the control's path, the
 * one value the control stores, so the record never names a prescription
 * that does not exist. Nothing is written when no quantity was entered, and
 * changing the category, or the control leaving the form, before then drops
 * what was entered.
 *
 * Once the record names one: what it gave and when, with a link to it. A
 * record naming one this store cannot find (made in another store, or never
 * written) or cannot read says so, and never offers the search: picking an
 * item there would give the stock a second time.
 */
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  type JSX,
} from 'solid-js';
import { formatNumber, localisedDate, t } from '../../intl';
import { unitsToLens } from '../allocation/units';
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
  // The prescription the record names.
  const namedId = () => {
    const id = d().get(props.path);
    return typeof id === 'string' && id !== '' ? id : undefined;
  };

  const [item, setItem] = createSignal<ItemOption>();
  // Units to give from each batch, by stock line id.
  const [units, setUnits] = createSignal<Record<string, number>>({});
  const batches = useItemBatches(() => item()?.id);
  // The id the prescription is written under: chosen when an item is picked,
  // kept across a retried save.
  const [pendingId, setPendingId] = createSignal<string>();
  // Set once the prescription is written, so it is not written again and
  // what it gave shows, even when the record's own save then fails.
  const [written, setWritten] = createSignal(false);

  const shownId = () => namedId() ?? (written() ? pendingId() : undefined);
  const summary = usePrescriptionSummary(shownId);

  const clear = () => {
    setItem(undefined);
    setUnits({});
    setPendingId(undefined);
    props.form.setDirty(false);
  };
  // A new category starts again.
  createEffect(
    on(
      () => props.itemCategoryName,
      () => {
        if (shownId() === undefined) clear();
      },
      { defer: true }
    )
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
    setPendingId(generateUUID());
  };

  // In packs, as the server takes them and the prescription screen converts.
  const packsToGive = () =>
    (batches.data() ?? []).flatMap(batch => {
      const given = units()[batch.id] ?? 0;
      return given > 0
        ? [
            {
              stockLineId: batch.id,
              numberOfPacks: unitsToLens(given, {
                kind: 'packs',
                size: batch.packSize,
              }),
            },
          ]
        : [];
    });
  const unitsGiven = () =>
    Object.values(units()).reduce((total, given) => total + given, 0);

  /*
   * solid/reactivity is disabled for the registration below, as the CIV
   * payment form disables it for its own: the handlers are callbacks the host
   * runs during the save, and reading the signals at that moment is the point.
   * `form` is one stable object for the form's life.
   */
  /* eslint-disable solid/reactivity */
  props.form.onBeforeSave(async () => {
    if (namedId()) return;
    const id = pendingId();
    if (!written()) {
      const chosen = item();
      const lines = packsToGive();
      if (!id || !chosen || lines.length === 0) return;
      const result = await createPrescription({
        id,
        patientId: props.patientId,
        itemId: chosen.id,
        lines,
        prescribedQuantity: unitsGiven(),
      });
      if (result.kind === 'failed') throw new Error(result.message);
      setWritten(true);
    }
    // Before the host takes the draft to save, so the record names it.
    d().set(props.path, id);
  });
  props.form.onAfterSave(() => {
    // What was entered is written as the prescription, or saved with nothing.
    props.form.setDirty(false);
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

  return (
    <Show
      when={shownId() === undefined}
      fallback={
        <Switch>
          <Match when={summary.data()}>
            {found => (
              <Alert severity="success">
                <HStack justify="between" wrap>
                  <span>{given()}</span>
                  <RecordLink
                    path={prescriptionDetailPath(found().id)}
                    testId={props.testId ? `${props.testId}-link` : undefined}
                  >
                    {t('button.view-prescription')}
                  </RecordLink>
                </HStack>
              </Alert>
            )}
          </Match>
          <Match when={summary.outcome() === 'not-found'}>
            <Alert severity="info">
              {t('messages.prescription-not-in-store')}
            </Alert>
          </Match>
          <Match when={summary.outcome() === 'unreadable'}>
            <Alert severity="error">{t('error.prescription-not-read')}</Alert>
          </Match>
        </Switch>
      }
    >
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
                          {formatNumber(batch.availablePacks * batch.packSize)}
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
    </Show>
  );
};
