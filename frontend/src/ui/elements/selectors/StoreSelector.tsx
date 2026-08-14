import { createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { TextField } from '../inputs/TextField';
import { Button } from '../buttons/Button';
import { StatusChip } from '../feedback/StatusChip';
import {
  ChevronRightIcon,
  CheckCircleIcon,
  CircleDashedIcon,
} from '../../icons';
import { matchesSearch } from '../../utils/searchText';
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
 * review): card rows (with Default / Last-used / Current chips), the pinned
 * previous/default group under its own heading, a search field only when the
 * list is long (7+ stores), and the "Always open" checkbox at the top.
 * Presentational and dismiss-agnostic — it takes the (already-ordered) stores
 * and reports the chosen id via onConfirm; the host decides what confirming
 * does.
 *
 * Clicking a row CONFIRMS it — no separate Continue (D113, issue #193); arrow
 * keys move the highlighted row and Enter anywhere in the panel confirms it
 * (spec startup S3 › keyboard, OMS-REG-LGN-02.15–.18, .23); the effective
 * highlight falls back to default → last-used → first visible so Enter always
 * has a target, and is scrolled into view on open so a pinned row below the
 * list's fold is never hidden (.37).
 *
 * Each row names its store's code under the name (spec S3, .34): the search
 * matches on code, so a result set filtered by one has to be able to show why
 * it matched — and codes are how similarly-named stores are told apart.
 * Matching is case- AND accent-insensitive (.33, ui/utils/searchText), without
 * which an accented list is unsearchable to anyone typing plain letters.
 *
 * The always-open toggle sits BELOW the list, quiet and one line (.24). It
 * was a checkbox above the search, which got three things wrong: it took the
 * panel's best slot for a once-ever preference, its label ("Remember my
 * choice") could not say what was remembered, and its two directions have
 * different timing with nothing to show for it. Its label states the
 * relationship to the pick still to come — "always open the store I pick" —
 * rather than naming a store: every row confirms on click, so a label naming
 * the HIGHLIGHTED row would misdescribe any pointer pick made elsewhere in
 * the list.
 *
 * The toggle's two directions reach the host at different moments (spec
 * startup SL-9): on, it rides the confirm as onConfirm's `alwaysOpen` flag —
 * the store being confirmed is what gets saved (.24) — while every toggle is
 * also reported at once via onAlwaysOpenChange, which is how turning it OFF
 * clears the saved store immediately, pick or no pick (.32). A toggle before
 * the pick, never a prompt after it, so choosing a store stays one
 * interaction. It arrives showing the device's saved opt-in: the host seeds
 * it via `defaultAlwaysOpen` (.31), false on a fresh device.
 *
 * Colour independence: the Default / Last-used / Current markers are
 * StatusChips (dot + label), never colour alone; the active row is a token
 * tint AND aria-selected.
 */
export const StoreSelector = (props: {
  stores: StoreOption[];
  defaultStoreId?: string;
  lastUsedStoreId?: string;
  /** The store the user is ALREADY in — the switch modal's host passes it, the
   * sign-in host has none. Marked _Current_, which also suppresses its
   * _Last used_ chip: entering a store records it as the previous one, so in
   * the switch panel the current store always carries both, and "Last used"
   * on the store you are standing in reads as a suggestion to go somewhere
   * you already are (spec S3, OMS-REG-LGN-02.35). */
  currentStoreId?: string;
  /** How many stores lead the list as the pinned previous/default group —
   * rendered under a "Recent stores" heading (0/undefined: one unlabelled
   * group). The caller pinned them; only it knows how many rows are "the
   * pins". */
  pinnedCount?: number;
  /** Let the list use the taller allowance, for a host that owns a whole page
   * rather than a modal's box. The routed sign-in screen sets it: the login
   * frame gives the panel a full viewport column, so the modal's cap left it
   * scrolling with most of a screen going spare beneath. The modal keeps the
   * cap — it is the case that genuinely needs one. */
  fillHeight?: boolean;
  /** Skip the panel's own <h2> — for a host whose chrome already carries the
   * heading (the store-switch modal's Dialog title, spec startup S3). The
   * list keeps its own aria-label either way. */
  hideTitle?: boolean;
  /** The always-open toggle's starting state — the device's saved opt-in
   * (spec SL-9, OMS-REG-LGN-02.31): true while an always-open store is saved
   * for the user. Read once at mount; both hosts mount the panel fresh per
   * show. */
  defaultAlwaysOpen?: boolean;
  /** Fired on every toggle, before any pick. The host persists the
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

  // The panel's own root, so row lookups are scoped to THIS panel rather than
  // to the document — two panels can never disagree about whose rows these are.
  let panel: HTMLDivElement | undefined;
  let searchInput: HTMLInputElement | undefined;

  // Focus the keyboard path's starting point on mount: the search when it
  // renders (type to filter, Enter to confirm), otherwise the highlighted row
  // (arrows + Enter work immediately). Either way the highlighted row is
  // scrolled into view (.37) — it may be below the list's fold, and focusing
  // the search alone would leave it hidden. Deferred to an effect so the row
  // buttons exist.
  let focusedOnMount = false;
  createEffect(() => {
    if (focusedOnMount) return;
    focusedOnMount = true;
    const highlighted = rowButton(selectedId());
    highlighted?.scrollIntoView({ block: 'nearest' });
    if (showSearch()) searchInput?.focus();
    else highlighted?.focus();
  });

  const rowButton = (id: string | undefined) =>
    id
      ? panel?.querySelector<HTMLButtonElement>(`[data-store-id="${id}"]`)
      : null;

  const confirm = (store: StoreOption) =>
    props.onConfirm(store.id, alwaysOpen());

  const clearSearch = () => {
    setQuery('');
    searchInput?.focus();
  };

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
  // confirm the highlighted row.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(e.key === 'ArrowDown' ? 1 : -1, e.target as HTMLElement);
      return;
    }
    if (e.key !== 'Enter') return;
    // The always-open toggle is a button: Enter on it is its OWN activation,
    // not a shortcut to confirm the highlighted store. Every other Enter in
    // the panel falls through to the pick (spec S3 › keyboard).
    if ((e.target as HTMLElement).closest(`.${styles.alwaysOpen}`)) return;
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
    const q = query().trim();
    if (!q) return props.stores;
    return props.stores.filter(s => matchesSearch(q, s.name, s.code));
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

  // The list in one or two labelled groups. The pinned previous/default rows
  // lead under "Recent stores" and the remainder sits under "All stores" — a
  // heading each, rather than the bare rule the group division used to be: with
  // a single pin a rule reads as an accidental gap, and it says nothing to a
  // screen reader. A FILTERED list is one flat result set with no heading (the
  // pins have no meaning among matches), as is a list with nothing pinned.
  const groups = createMemo<{ label?: string; stores: StoreOption[] }[]>(() => {
    const rows = visible();
    const pinned = props.pinnedCount ?? 0;
    if (query().trim() || pinned <= 0 || pinned >= rows.length)
      return [{ stores: rows }];
    return [
      { label: t('label.recent-stores'), stores: rows.slice(0, pinned) },
      { label: t('label.all-stores'), stores: rows.slice(pinned) },
    ];
  });

  return (
    <div
      class={styles.panel}
      ref={panel}
      data-fill={props.fillHeight ? '' : undefined}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
    >
      {/* h2: the hosting screen carries the page's h1 (the login frame's
          brand statement); this heads the panel region within it. */}
      <Show when={!props.hideTitle}>
        <h2 class={styles.title}>{t('heading.select-store')}</h2>
      </Show>

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
        fallback={
          // Naming the text that matched nothing is what tells the user the
          // app looked and found none, rather than that it broke; the clear
          // control is the way back to the full list without selecting and
          // deleting the query by hand (.36).
          <div class={styles.empty} data-testid="store-selector-empty">
            <p class={styles.emptyMessage}>
              {t('store.no-results-for', { query: query().trim() })}
            </p>
            <Button
              variant="ghost"
              size="small"
              onClick={clearSearch}
              data-testid="store-selector-clear-search"
            >
              {t('label.clear-search')}
            </Button>
          </div>
        }
      >
        {/* A listbox's rows carry their semantics from the roles, not from
            list markup — ARIA's `group` is what labels a run of options, and
            it takes the heading's own text as its accessible name (so the
            visible copy of it is aria-hidden, not announced twice). The
            heading sits OUTSIDE the bordered box its rows share, so the
            presentational wrapper is what pairs the two. */}
        <div
          class={styles.list}
          role="listbox"
          aria-label={t('heading.select-store')}
        >
          <For each={groups()}>
            {group => (
              <div class={styles.groupBlock} role="presentation">
                <Show when={group.label}>
                  <span class={styles.groupLabel} aria-hidden="true">
                    {group.label}
                  </span>
                </Show>
                <div
                  class={styles.group}
                  role={group.label ? 'group' : 'presentation'}
                  aria-label={group.label}
                >
                  <For each={group.stores}>
                    {store => (
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
                        <span class={styles.storeCode}>{store.code}</span>
                        <span class={styles.tags}>
                          <Show when={store.id === props.currentStoreId}>
                            <StatusChip
                              label={t('label.current')}
                              colour="var(--status-verified)"
                            />
                          </Show>
                          <Show when={store.id === props.defaultStoreId}>
                            <StatusChip
                              label={t('label.default')}
                              colour="var(--status-new)"
                            />
                          </Show>
                          <Show
                            when={
                              store.id === props.lastUsedStoreId &&
                              store.id !== props.currentStoreId
                            }
                          >
                            <StatusChip
                              label={t('label.last-used')}
                              colour="var(--status-verified)"
                            />
                          </Show>
                        </span>
                        <ChevronRightIcon class={styles.chevron} />
                      </button>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* The always-open opt-in (SL-9, .24): on, the store clicked next is
          saved and the next sign-in skips this screen. A pressed-state button
          rather than a checkbox — it reads as one quiet line of prose here
          instead of a form field competing with the search, and aria-pressed
          carries the state that a checkbox's `checked` used to. It stays
          rendered when a filter matches nothing: turning the opt-in OFF takes
          effect with no pick at all (.32), so a bad search must not remove the
          only control that can withdraw it. */}
      <button
        type="button"
        class={styles.alwaysOpen}
        aria-pressed={alwaysOpen()}
        data-testid="store-always-open-toggle"
        onClick={() => {
          const on = !alwaysOpen();
          setAlwaysOpen(on);
          props.onAlwaysOpenChange?.(on);
        }}
      >
        <Show
          when={alwaysOpen()}
          fallback={<CircleDashedIcon class={styles.alwaysOpenIcon} />}
        >
          <CheckCircleIcon class={styles.alwaysOpenIcon} />
        </Show>
        {t('label.always-open-picked-store')}
      </button>
    </div>
  );
};
