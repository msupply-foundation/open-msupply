import { createMemo, createSignal, onMount, For, Show, type JSX } from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { TextField } from '../../ui/elements/inputs/TextField';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { CancelButton } from '../../ui/elements/buttons/StandardButtons';
import { NonProgramMasterLists } from './masterList.generated';
import styles from './MasterListPickerModal.module.css';

// The shared master-list picker (spec/internal-orders S7; reused by the
// requisitions detail, spec/requisitions S2 § page actions): a modal listing
// the store's own non-program master lists, one row per name, filtered by a
// search field.
// Clicking a row hands the choice back — the parent then confirms the bulk add
// (spec S7: "choosing a list closes the picker and asks a confirmation"). The
// picker itself never mutates.

type MasterList = { id: string; name: string };

export interface MasterListPickerModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  /** A row was clicked — the parent closes the picker and confirms the add. */
  onSelect: (list: MasterList) => void;
}

export const MasterListPickerModal = (
  props: MasterListPickerModalProps
): JSX.Element => (
  <Show when={props.open}>
    <PickerContent {...props} />
  </Show>
);

const PickerContent = (props: MasterListPickerModalProps): JSX.Element => {
  const [lists, setLists] = createSignal<MasterList[]>();
  const [search, setSearch] = createSignal('');

  // Fetch once on open (a fresh modal — a first-load spinner is fine, nothing
  // live to lose). The list is small and searched client-side.
  onMount(() => {
    void (async () => {
      const result = await graphqlFetch(NonProgramMasterLists, {
        storeId: props.storeId,
      });
      setLists(
        result.kind === 'success' ? result.data.masterLists.nodes : []
      );
    })();
  });

  const filtered = createMemo(() => {
    const all = lists() ?? [];
    const term = search().trim().toLowerCase();
    return term ? all.filter(l => l.name.toLowerCase().includes(term)) : all;
  });

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={t('label.master-lists')}
      testId="master-list-picker-modal"
      actions={<CancelButton onClick={props.onClose} />}
    >
      <TextField
        label={t('placeholder.search-by-name')}
        hideLabel
        width="full"
        placeholder={t('placeholder.search-by-name')}
        value={search()}
        onInput={e => setSearch(e.currentTarget.value)}
      />
      <Show
        when={lists()}
        fallback={
          <div class={styles.loading}>
            <Spinner center />
          </div>
        }
      >
        <Show
          when={filtered().length > 0}
          fallback={<EmptyState message={t('error.no-master-lists')} />}
        >
          <div class={styles.list}>
            <For each={filtered()}>
              {list => (
                <button
                  type="button"
                  class={styles.row}
                  data-testid={`master-list-row-${list.id}`}
                  onClick={() => props.onSelect(list)}
                >
                  {list.name}
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </Dialog>
  );
};
