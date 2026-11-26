import {
  createResource,
  createSignal,
  Index,
  Match,
  Show,
  Switch,
} from 'solid-js';
import { createStore, unwrap } from 'solid-js/store';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { gated } from '@/api/gated';
import { t, tPlural } from '@/intl';
import { ItemSearch } from '@/domain/item/ItemSearch';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { ReorderableList } from '@/ui/elements/inputs/ReorderableList';
import { TrashIcon } from '@/ui/icons';
import { createFocusTargets } from '@/ui/utils/createFocusTarget';
import { SimpleCommonMedicines } from './simpleDispensing.generated';
import {
  CommonMedicineItems,
  UpsertCommonMedicines,
} from './commonMedicinesEditor.generated';
import {
  AMOUNT_PLACES,
  COMFORTABLE_COUNT,
  draftFrom,
  hasRepeats,
  MAX_AMOUNT,
  newRow,
  reordered,
  repeatedPlaces,
  saveInput,
  type EditorRow,
} from './commonMedicinesEditing';
import styles from './SimpleDispensing.module.css';

/*
 * The common medicines editor (spec/prescriptions › setting up the common
 * medicines; ui-surface S9): the store's list behind the Simple screen's
 * cards, edited where the cards are used. Opened from the screen, so it reads
 * the list afresh rather than trusting the screen's read, which may be from
 * before another device saved. Everything in it is a draft until Save, which
 * replaces the whole list.
 */
export const CommonMedicinesEditor = (props: {
  storeId: string;
  onClose: () => void;
  /** The list was saved: the screen reads its cards again. */
  onSaved: () => void;
}) => {
  // The draft. A store, matched by item id: typing an amount writes one place
  // of one row, so the field being typed in is never rebuilt
  // (kdd/solid-reactivity-pitfalls › No remounts on interaction).
  const [draft, setDraft] = createStore<{ rows: EditorRow[] }>({ rows: [] });
  const [dropped, setDropped] = createSignal(0);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string>();
  // Each medicine's first amount field, by item id: where choosing a medicine
  // from the search lands.
  const firstAmount = createFocusTargets();

  // The list and its medicines' names, in the background: the screen behind
  // may hold a visit, and the app's error dialog would offer a reload that
  // loses it. True once read into the draft, false when it couldn't be.
  const readList = async (): Promise<boolean> => {
    const listed = await graphqlFetch(
      SimpleCommonMedicines,
      { storeId: props.storeId },
      { background: true }
    );
    if (listed.kind !== 'success') return false;
    const list = listed.data.commonMedicines;
    const ids = list.map(medicine => medicine.itemId);
    let items: Parameters<typeof draftFrom>[1] = [];
    if (ids.length > 0) {
      const read = await graphqlFetch(
        CommonMedicineItems,
        { storeId: props.storeId, ids, page: { first: ids.length } },
        { background: true }
      );
      if (read.kind !== 'success') return false;
      if (read.data.items.__typename !== 'ItemConnector') return false;
      items = read.data.items.nodes;
    }
    const { rows, dropped: count } = draftFrom(list, items);
    setDraft('rows', rows);
    setDropped(count);
    return true;
  };
  // First fetched on opening, under the open screen: read through `gated`,
  // never suspending.
  const [listRead, { refetch: readAgain }] = createResource(readList);
  const read = () => gated(listRead) === true;
  const unread = () => listRead.state === 'ready' && gated(listRead) === false;

  const listed = () => new Set(draft.rows.map(row => row.item.id));
  const rowOf = (itemId: string) =>
    draft.rows.find(row => row.item.id === itemId);

  const setAmount = (itemId: string, place: number, value?: number) => {
    setError(undefined);
    setDraft('rows', row => row.item.id === itemId, 'amounts', place, value);
  };
  const remove = (itemId: string) => {
    setError(undefined);
    setDraft('rows', rows => rows.filter(row => row.item.id !== itemId));
  };
  const reorder = (orderedIds: string[]) => {
    setError(undefined);
    setDraft('rows', reordered(unwrap(draft.rows), orderedIds));
  };

  // Choosing a medicine: one already on the list adds nothing and goes to its
  // amounts; a new one goes at the end, with none yet. The search's value is
  // the choice and then nothing, so it is empty again for the next.
  const [searchValue, setSearchValue] = createSignal<string>();
  const add = (item: {
    id: string;
    code: string;
    name: string;
    unitName: string | null;
  }) => {
    setError(undefined);
    if (!listed().has(item.id)) {
      const { id, code, name, unitName } = item;
      setDraft('rows', draft.rows.length, newRow({ id, code, name, unitName }));
    }
    setSearchValue(item.id);
    setSearchValue(undefined);
    firstAmount.focus(item.id);
  };

  const canSave = () => read() && !saving() && !hasRepeats(draft.rows);

  const save = async () => {
    if (!canSave()) return;
    setError(undefined);
    setSaving(true);
    const result = await graphqlFetch(
      UpsertCommonMedicines,
      { storeId: props.storeId, input: saveInput(unwrap(draft.rows)) },
      { returnGraphqlErrors: true, background: true }
    );
    setSaving(false);
    if (result.kind === 'success') return props.onSaved();
    if (result.kind === 'graphqlError' && isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return setError(t('error.common-medicines-not-allowed'));
    }
    // A refused list names the rule broken, in the server's English: shown
    // after the editor's own message rather than in its place.
    const reason =
      result.kind === 'graphqlError'
        ? (result.errors[0]?.extensions?.details ?? result.errors[0]?.message)
        : undefined;
    setError(
      typeof reason === 'string' && reason.length > 0
        ? `${t('error.common-medicines-not-saved')} ${reason}`
        : t('error.common-medicines-not-saved')
    );
  };

  return (
    <Dialog
      open
      onClose={() => props.onClose()}
      dismissable={!saving()}
      title={t('heading.common-medicines')}
      description={t('messages.common-medicines-editor-intro')}
      width="wide"
      testId="common-medicines-editor"
      actionsLead={
        <Show
          when={error()}
          fallback={
            <Show when={read()}>
              <span
                class={styles.editorCount}
                data-testid="common-medicines-count"
              >
                {tPlural('label.common-medicine-count', draft.rows.length)}
              </span>
            </Show>
          }
        >
          {message => (
            <Alert severity="error" compact testId="common-medicines-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            disabled={saving()}
            data-testid="dialog-button-cancel"
            onClick={() => props.onClose()}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            disabled={!canSave()}
            loading={saving()}
            data-testid="dialog-button-save"
            onClick={() => void save()}
          >
            {t('button.save')}
          </Button>
        </>
      }
    >
      <div class={styles.medicinesEditor}>
        <Switch
          fallback={
            <p data-testid="common-medicines-loading">{t('loading')}</p>
          }
        >
          <Match when={unread()}>
            <Alert severity="error" compact testId="common-medicines-not-read">
              {t('messages.common-medicines-list-not-read')}
            </Alert>
            <div>
              <Button
                variant="ghost"
                loading={listRead.loading}
                data-testid="common-medicines-read-again-button"
                onClick={() => void readAgain()}
              >
                {t('button.try-again')}
              </Button>
            </div>
          </Match>
          <Match when={read()}>
            <Show when={dropped() > 0}>
              <Alert severity="info" compact testId="common-medicines-dropped">
                {tPlural('messages.common-medicines-dropped', dropped())}
              </Alert>
            </Show>
            <Show
              when={draft.rows.length > 0}
              fallback={
                <p
                  class={styles.editorEmpty}
                  data-testid="common-medicines-none-yet"
                >
                  {t('messages.no-common-medicines-yet')}
                </p>
              }
            >
              <ReorderableList
                label={t('heading.common-medicines')}
                showPosition
                disabled={saving()}
                testId="common-medicines-list"
                items={draft.rows.map(row => ({
                  id: row.item.id,
                  label: row.item.name,
                  description: row.item.code,
                }))}
                onReorder={reorder}
                rowEnd={medicine => {
                  const amounts = () => rowOf(medicine.id)?.amounts ?? [];
                  return (
                    <>
                      <span
                        class={styles.editorAmounts}
                        data-testid="common-medicine-amounts"
                      >
                        <Index each={Array.from({ length: AMOUNT_PLACES })}>
                          {(_, place) => (
                            <NumberField
                              // The first place is where choosing this
                              // medicine in the search lands.
                              ref={el => {
                                if (place === 0)
                                  firstAmount.ref(medicine.id)(el);
                              }}
                              label={t('label.common-medicine-amount', {
                                item: medicine.label,
                                place: place + 1,
                              })}
                              hideLabel
                              size="small"
                              width="compact"
                              min={1}
                              max={MAX_AMOUNT}
                              decimalLimit={0}
                              disabled={saving()}
                              value={amounts()[place]}
                              onChange={value =>
                                setAmount(medicine.id, place, value)
                              }
                              error={
                                repeatedPlaces(amounts())[place]
                                  ? t(
                                      'messages.common-medicine-amount-repeated'
                                    )
                                  : undefined
                              }
                              errorTestId="common-medicine-amount-repeated"
                              data-testid="common-medicine-amount-input"
                            />
                          )}
                        </Index>
                        <span class={styles.editorUnit}>
                          {rowOf(medicine.id)?.item.unitName ?? ''}
                        </span>
                      </span>
                      <IconButton
                        icon={<TrashIcon />}
                        size="small"
                        label={t('label.remove-common-medicine', {
                          item: medicine.label,
                        })}
                        disabled={saving()}
                        data-testid="remove-common-medicine-button"
                        onClick={() => remove(medicine.id)}
                      />
                    </>
                  );
                }}
              />
            </Show>
            <ItemSearch
              label={t('label.add-a-common-medicine')}
              hideLabel
              placeholder={t('label.add-a-common-medicine')}
              storeId={props.storeId}
              // The medicines the Simple screen's own search offers.
              includeHiddenWithStock
              width="full"
              clearable={false}
              value={searchValue()}
              disabled={saving()}
              presentInDocument={{
                probe: ids =>
                  Promise.resolve(ids.filter(id => listed().has(id))),
                label: t('label.on-common-medicines'),
              }}
              onSelect={item => {
                if (item) add(item);
              }}
            />
            <Show when={draft.rows.length > COMFORTABLE_COUNT}>
              <Alert
                severity="warning"
                compact
                testId="common-medicines-over-twelve"
              >
                {t('messages.common-medicines-over-twelve', {
                  count: COMFORTABLE_COUNT,
                })}
              </Alert>
            </Show>
          </Match>
        </Switch>
      </div>
    </Dialog>
  );
};
