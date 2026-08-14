import { createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { TextField } from '../inputs/TextField';
import { Checkbox } from '../inputs/Checkbox';
import { StatusChip } from '../feedback/StatusChip';
import { t } from '../../../intl';
import styles from './StoreSelector.module.css';

export type StoreOption = {
  id: string;
  code: string;
  name: string;
};

// Below this many stores the search box is not rendered — a short list is
// scanned faster than it is searched (issue #193 point 3; the keyboard path
// then starts focused on the highlighted row instead).
const SEARCH_THRESHOLD = 7;

/*
 * Store selector — the store-picker panel, per issue #193 (mark-prins's
 * review): card rows (with Default / Last-used chips), the pinned
 * previous/default group divided from the rest, a search field only when the
 * list is long (7+ stores), and the "Always open" checkbox at the top.
 * Presentational and dismiss-agnostic — it takes the (already-ordered) stores
 * and reports the chosen id via onConfirm; the host decides what confirming
 * does.
 *
 * Clicking a row CONFIRMS it — no separate Continue (D113, issue #193); arrow
 * keys move the highlighted row and Enter anywhere in the panel confirms it
 * (spec startup S3 › keyboard, OMS-REG-LGN-02.15–.18, .23); the effective
 * highlight falls back to default → last-used → first visible so Enter always
 * has a target.
 *
 * The checkbox's two directions reach the host at different moments (spec
 * startup SL-9): ticked, it rides the confirm as onConfirm's `alwaysOpen`
 * flag — the store being confirmed is what gets saved (.24) — while every
 * toggle is also reported at once via onAlwaysOpenChange, which is how an
 * UNTICK clears the saved store immediately, pick or no pick (.32). A
 * checkbox before the pick, never a prompt after it, so choosing a store
 * stays one interaction. It arrives showing the device's saved opt-in: the
 * host seeds it via `defaultAlwaysOpen` (.31), false on a fresh device.
 *
 * Colour independence: the Default / Last-used markers are StatusChips (dot +
 * label), never colour alone; the active row is a token tint AND
 * aria-selected.
 */
export const StoreSelector = (props: {
  stores: StoreOption[];
  defaultStoreId?: string;
  lastUsedStoreId?: string;
  /** How many stores lead the list as the pinned previous/default group —
   * rendered above a divider (0/undefined: no divider). The caller pinned
   * them; only it knows how many rows are "the pins". */
  pinnedCount?: number;
  /** Skip the panel's own <h2> — for a host whose chrome already carries the
   * heading (the store-switch modal's Dialog title, spec startup S3). The
   * list keeps its own aria-label either way. */
  hideTitle?: boolean;
  /** The always-open checkbox's starting state — the device's saved opt-in
   * (spec SL-9, OMS-REG-LGN-02.31): true while an always-open store is saved
   * for the user. Read once at mount; both hosts mount the panel fresh per
   * show. */
  defaultAlwaysOpen?: boolean;
  /** Fired on every checkbox toggle, before any pick. The host persists the
   * UNTICK from here — withdrawing the opt-in needs no store, so it must not
   * wait for a confirm that may never come (spec SL-9, OMS-REG-LGN-02.32). */
  onAlwaysOpenChange?: (alwaysOpen: boolean) => void;
  onConfirm: (storeId: string, alwaysOpen: boolean) => void;
}) => {
  const [query, setQuery] = createSignal('');
  const [selected, setSelected] = createSignal<string | undefined>();
  const [alwaysOpen, setAlwaysOpen] = createSignal(
    props.defaultAlwaysOpen ?? false
  );

  const showSearch = () => props.stores.length >= SEARCH_THRESHOLD;

  // Focus the keyboard path's starting point on mount: the search when it
  // renders (type to filter, Enter to confirm), otherwise the highlighted row
  // (arrows + Enter work immediately). Deferred to an effect so the row
  // buttons exist.
  let searchInput: HTMLInputElement | undefined;
  let focusedOnMount = false;
  createEffect(() => {
    if (focusedOnMount) return;
    focusedOnMount = true;
    if (showSearch()) searchInput?.focus();
    else rowButton(selectedId())?.focus();
  });

  const rowButton = (id: string | undefined) =>
    id
      ? document.querySelector<HTMLButtonElement>(`[data-store-id="${id}"]`)
      : null;

  const confirm = (store: StoreOption) =>
    props.onConfirm(store.id, alwaysOpen());

  // Arrow up/down moves the selection through the visible rows (clamped at the
  // ends). Focus follows only when it's already on a row, so arrowing from the
  // search field keeps the caret there; the moved-to row is scrolled into view.
  const moveSelection = (delta: 1 | -1, from: HTMLElement) => {
    const rows = visible();
    const current = rows.findIndex(s => s.id === selectedId());
    const next = rows[current === -1 ? 0 : current + delta];
    if (!next) return;
    setSelected(next.id);
    const button = rowButton(next.id);
    button?.scrollIntoView({ block: 'nearest' });
    if (from.closest('[data-store-id]')) button?.focus();
  };

  // Enter anywhere in the panel confirms: the focused row if the key landed on
  // one, otherwise the highlighted (aria-selected) row — so typing a search
  // and hitting Enter goes straight in. preventDefault stops a focused row
  // <button> also firing its click activation (a double confirm). Enter on
  // the checkbox is left alone — Space toggles it, Enter falls through to
  // confirm the highlighted row, exactly like Enter from the search field.
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
    const store = visible().find(s => s.id === id);
    if (!store) return;
    e.preventDefault();
    confirm(store);
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
    const store = visible().find(s => s.id === selectedId());
    if (store) confirm(store);
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

  // The pinned previous/default group is divided from the rest — only while
  // the full, unfiltered list shows (a filtered list is one flat result set).
  const dividerAfter = (index: number) =>
    !query().trim() &&
    props.pinnedCount !== undefined &&
    props.pinnedCount > 0 &&
    props.pinnedCount < visible().length &&
    index === props.pinnedCount - 1;

  return (
    <div
      class={styles.panel}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
    >
      {/* h2: the hosting screen carries the page's h1 (the login frame's
          brand statement); this heads the panel region within it. */}
      <Show when={!props.hideTitle}>
        <h2 class={styles.title}>{t('heading.select-store')}</h2>
      </Show>

      {/* The always-open save, decided BEFORE the pick (SL-9): ticked, the
          store clicked next is saved and sign-in skips this screen. At the
          top per mark-prins's issue #193 review — visible before the row
          click that ends the screen. Same label key as the current app's
          remember checkbox, so its translations carry over. */}
      <Checkbox
        label={t('message.remember-store-choice')}
        checked={alwaysOpen()}
        onChange={on => {
          setAlwaysOpen(on);
          props.onAlwaysOpenChange?.(on);
        }}
        testId="store-always-open-checkbox"
      />

      <Show when={showSearch()}>
        <TextField
          ref={searchInput}
          label={t('placeholder.search-by-name')}
          hideLabel
          value={query()}
          placeholder={t('placeholder.search-by-name-or-code')}
          onInput={e => setQuery(e.currentTarget.value)}
          data-testid="store-selector-search"
        />
      </Show>

      <Show
        when={visible().length > 0}
        fallback={<div class={styles.empty}>{t('error.no-results')}</div>}
      >
        <ul
          class={styles.list}
          role="listbox"
          aria-label={t('heading.select-store')}
        >
          <For each={visible()}>
            {(store, index) => (
              <li classList={{ [styles.dividedRow]: dividerAfter(index()) }}>
                <button
                  type="button"
                  class={styles.row}
                  role="option"
                  aria-selected={store.id === selectedId()}
                  data-active={store.id === selectedId() ? '' : undefined}
                  data-store-id={store.id}
                  data-testid={`store-select-option-${store.code}`}
                  onClick={() => confirm(store)}
                >
                  <span class={styles.storeName}>{store.name}</span>
                  <span class={styles.tags}>
                    <Show when={store.id === props.defaultStoreId}>
                      <StatusChip
                        label={t('label.default')}
                        colour="var(--status-new)"
                      />
                    </Show>
                    <Show when={store.id === props.lastUsedStoreId}>
                      <StatusChip
                        label={t('label.last-used')}
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
  );
};
