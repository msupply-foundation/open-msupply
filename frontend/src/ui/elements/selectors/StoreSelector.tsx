import { createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { TextField } from '../inputs/TextField';
import { StatusChip } from '../feedback/StatusChip';
import { Button } from '../buttons/Button';
import { ArrowRightIcon } from '../../icons';
import { t } from '../../../intl';
import styles from './StoreSelector.module.css';

export type StoreOption = {
  id: string;
  code: string;
  name: string;
};

/*
 * Store selector — the searchable store-picker panel, styled after the current
 * app's login store-selector (host/LoginStoreSelectorPanel): a search field, a
 * bordered scrollable list of selectable rows (with Default / Last-used chips),
 * and a Continue button. Presentational and dismiss-agnostic — it takes the
 * (already-ordered) stores and reports the chosen id via onConfirm; the host
 * decides where it lives (in the app it fills the store-selection Dialog) and
 * what confirming does. Selection is select-then-Continue (double-click a row
 * confirms directly; arrow keys move the highlighted row and Enter anywhere in
 * the panel confirms it — spec startup S3 › keyboard, AC-SL9); the effective
 * selection falls back to default → last-used
 * → first visible so Continue is always actionable.
 *
 * Colour independence: the Default / Last-used markers are StatusChips (dot +
 * label), never colour alone; the active row is a token tint AND aria-selected.
 */
export const StoreSelector = (props: {
  stores: StoreOption[];
  defaultStoreId?: string;
  lastUsedStoreId?: string;
  onConfirm: (storeId: string) => void;
}) => {
  const [query, setQuery] = createSignal('');
  const [selected, setSelected] = createSignal<string | undefined>();

  // Focus the search on mount so the keyboard path works from the moment the
  // panel appears: type to filter, Enter to confirm — no click needed first.
  let searchInput: HTMLInputElement | undefined;
  onMount(() => searchInput?.focus());

  // Arrow up/down moves the selection through the visible rows (clamped at the
  // ends). Focus follows only when it's already on a row, so arrowing from the
  // search field keeps the caret there; the moved-to row is scrolled into view.
  const moveSelection = (delta: 1 | -1, from: HTMLElement) => {
    const rows = visible();
    const current = rows.findIndex(s => s.id === selectedId());
    const next = rows[current === -1 ? 0 : current + delta];
    if (!next) return;
    setSelected(next.id);
    const button = document.querySelector<HTMLButtonElement>(
      `[data-store-id="${next.id}"]`
    );
    button?.scrollIntoView({ block: 'nearest' });
    if (from.closest('[data-store-id]')) button?.focus();
  };

  // Enter anywhere in the panel confirms: the focused row if the key landed on
  // one, otherwise the highlighted (aria-selected) row — so typing a search and
  // hitting Enter continues without reaching for Continue. preventDefault stops
  // the row/Continue <button>s also firing their click activation.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(e.key === 'ArrowDown' ? 1 : -1, e.target as HTMLElement);
      return;
    }
    if (e.key !== 'Enter') return;
    const row = (e.target as HTMLElement).closest('[data-store-id]');
    const id = row?.getAttribute('data-store-id') ?? selectedId();
    if (!id) return;
    e.preventDefault();
    props.onConfirm(id);
  };

  // Android soft keyboards (GBoard) report Enter with isComposing=true while
  // predictive text is underlining the word — and never end the composition —
  // so the keydown guard above swallows it. The IME-agnostic Enter signal is
  // beforeinput `insertLineBreak` (a CJK commit-Enter emits
  // `insertCompositionText` instead, so this only fires for a real Enter).
  // Desktop Enter never reaches here: the keydown handler's preventDefault
  // stops the input events, so this can't double-confirm.
  const handleBeforeInput = (e: InputEvent) => {
    if (e.inputType !== 'insertLineBreak') return;
    e.preventDefault();
    const id = selectedId();
    if (id) props.onConfirm(id);
  };

  const visible = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return props.stores;
    return props.stores.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  });

  // The effective selection: an explicit pick if it's still visible, else the
  // default, else last-used, else the first row — mirrors the app's fallback.
  const selectedId = createMemo(() => {
    const candidates = [
      selected(),
      props.defaultStoreId,
      props.lastUsedStoreId,
    ];
    for (const id of candidates) {
      if (id && visible().some(s => s.id === id)) return id;
    }
    return visible()[0]?.id;
  });

  return (
    <div
      class={styles.panel}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
    >
      <p class={styles.instructions}>{t('store.select-instructions')}</p>

      <TextField
        ref={searchInput}
        label={t('store.search')}
        hideLabel
        width="full"
        value={query()}
        placeholder={t('store.search-placeholder')}
        onInput={e => setQuery(e.currentTarget.value)}
      />

      <div class={styles.listPanel}>
        <Show
          when={visible().length > 0}
          fallback={<div class={styles.empty}>{t('store.no-results')}</div>}
        >
          <ul class={styles.list} role="listbox" aria-label={t('store.select')}>
            <For each={visible()}>
              {store => (
                <li>
                  <button
                    type="button"
                    class={styles.row}
                    role="option"
                    aria-selected={store.id === selectedId()}
                    data-active={store.id === selectedId() ? '' : undefined}
                    data-store-id={store.id}
                    onClick={() => setSelected(store.id)}
                    onDblClick={() => props.onConfirm(store.id)}
                  >
                    <span class={styles.storeName}>{store.name}</span>
                    <span class={styles.tags}>
                      <Show when={store.id === props.defaultStoreId}>
                        <StatusChip
                          label={t('store.default')}
                          colour="var(--status-new)"
                        />
                      </Show>
                      <Show when={store.id === props.lastUsedStoreId}>
                        <StatusChip
                          label={t('store.last-used')}
                          colour="var(--status-verified)"
                        />
                      </Show>
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>

      <div class={styles.footer}>
        <Button
          variant="secondary"
          icon={<ArrowRightIcon />}
          iconPosition="end"
          disabled={!selectedId()}
          onClick={() => selectedId() && props.onConfirm(selectedId()!)}
        >
          {t('store.continue')}
        </Button>
      </div>
    </div>
  );
};
