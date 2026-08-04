import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Show,
} from 'solid-js';
import { Dialog } from '../feedback/Dialog';
import { EmptyState } from '../feedback/EmptyState';
import { TextField } from '../inputs/TextField';
import { createFocusTarget } from '../../utils/createFocusTarget';
import { shortcutLabel, type Shortcut } from '../../utils/shortcuts';
import { t } from '../../../intl';
import styles from './CommandPaletteView.module.css';

/*
 * The command palette (spec/keyboard ui-surface S1) — PRESENTATIONAL. It is
 * handed a list of entries and reports which one was run; it knows nothing about
 * the registry, the router, or the store. The app-side host (src/keyboard/
 * CommandPalette.tsx) takes the registry snapshot and supplies these.
 *
 * Built on <Dialog>, which is doing a lot of work here for free:
 *   - showModal() puts the palette in the TOP LAYER, so it layers over an
 *     already-open dialog (KB-P1/AC-KB8) — verified on Chromium 138, along with
 *     the dialog beneath going inert and focus restoring back into it on close;
 *   - Escape reaches the UA's close request and never the window-level tail, so
 *     KB-X1 ("the palette dismisses, without navigating") is structural;
 *   - `initialFocus` seeds the search field after showModal() has parked focus
 *     on the panel (KB-P2/AC-KB9).
 *
 * NO cmdk-style library: this is a text field, a filtered list and an arrow-key
 * highlight, none of which carries an a11y contract worth buying
 * (kdd/own-simple-buy-hard).
 */

export interface PaletteEntry {
  /** Stable identity for the row, so highlighting never keys on the label. */
  id: string;
  /** The action's translated name (the host resolves the locale key). */
  name: string;
  /** Terms the row matches on besides its name (KB-P3). */
  keywords?: readonly string[];
  /** Rendered after the name, platform-spelled (KB-P4). */
  shortcut?: Shortcut;
  run: () => void;
}

export interface CommandPaletteViewProps {
  open: boolean;
  onClose: () => void;
  /** Every currently-registered, listable action (KB-P3). */
  entries: readonly PaletteEntry[];
}

export const CommandPaletteView = (props: CommandPaletteViewProps) => {
  const [query, setQuery] = createSignal('');
  // The highlighted row's id, or undefined for "the first match". Storing the ID
  // rather than an index means a highlight survives the list re-filtering under
  // it, and cannot point at a row that no longer exists.
  const [highlightId, setHighlightId] = createSignal<string>();
  const search = createFocusTarget();
  const listId = createUniqueId();

  /*
   * The palette always opens UNFILTERED (ui-surface S1 § States; KB-P3 lists
   * "every currently-registered action" without qualification).
   *
   * Reset on OPEN, not on close, because there are three close paths — the UA
   * close request from Escape, a scrim click, and running an action, which
   * dismisses via props.onClose directly (KB-P5's dismiss-then-run) — and only
   * the first two pass through Dialog's onClose. Resetting there left a run
   * action's term behind, so reopening showed the previous search and its single
   * match. One invariant at the one edge that every path crosses.
   *
   * It also has to clear rather than select-all: the search is a focus-seeded
   * text field, and KB-F2 forbids a seeded field from selecting its content
   * ("a keystroke MUST NOT wipe a value the user is meant to extend"). A
   * retained term would therefore be APPENDED to — type "stock" after a "loc"
   * search and you get "locstock", matching nothing.
   */
  createEffect(() => {
    if (!props.open) return;
    setQuery('');
    setHighlightId(undefined);
  });

  const matches = createMemo(() => {
    const term = query().trim().toLowerCase();
    if (!term) return props.entries;
    // KB-P3: by name AND by each action's search keywords, so a term matching
    // only a keyword still lists the row (AC-KB10).
    return props.entries.filter(
      entry =>
        entry.name.toLowerCase().includes(term) ||
        entry.keywords?.some(word => word.toLowerCase().includes(term)) === true
    );
  });

  // KB-P5's highlight: an explicit pick while it is still visible, else the
  // list's first entry — "where nothing has been highlighted yet, the highlight
  // starts from the list's first entry" (KB-N3).
  const highlighted = createMemo(() => {
    const rows = matches();
    const picked = highlightId();
    return rows.find(row => row.id === picked) ?? rows[0];
  });

  const move = (delta: 1 | -1) => {
    const rows = matches();
    if (rows.length === 0) return;
    const current = rows.findIndex(row => row.id === highlighted()?.id);
    // WRAPPING, not clamping: the palette is "an option list driven from a
    // search field above it", which is KB-N3's shape — and KB-N3 wraps at both
    // ends. KB-N1's list-table row focus clamps instead, which is why the two
    // are separate rules; that one is not built (kdd/keyboard-layer).
    const next = rows[(current + delta + rows.length) % rows.length];
    if (next) setHighlightId(next.id);
  };

  const run = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    // KB-P5's ordering is load-bearing: "Running an action dismisses the
    // palette, THEN performs it." An action that opens a dialog or navigates
    // must not do so underneath a palette that is still up.
    props.onClose();
    entry.run();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key !== 'Enter') return;
    // Consume it either way: with no match there is nothing to run, and Enter
    // must not fall through to whatever is beneath the palette (AC-KB13).
    event.preventDefault();
    run(highlighted());
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      // The palette has no visible heading; the hidden one is its accessible
      // name. The Help page's note points the user here (help/).
      title={t('heading.keyboard-shortcuts')}
      titleHidden
      initialFocus={search}
      // No panel behind it: the search field and the results list each carry
      // their own surface, so the palette floats as those two boxes over the
      // dimmed page rather than sitting on a card.
      chromeless
      widthRem={34}
      testId="command-palette"
    >
      <div class={styles.panel} onKeyDown={onKeyDown}>
        <TextField
          ref={search.ref}
          label={t('heading.keyboard-shortcuts')}
          hideLabel
          width="full"
          placeholder={t('cmdk.placeholder')}
          value={query()}
          onInput={event => {
            setQuery(event.currentTarget.value);
            // A new term makes the old pick meaningless; fall back to the first
            // match of the new list.
            setHighlightId(undefined);
          }}
          // The search drives a listbox below it, which is a combobox.
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={
            highlighted() ? `${listId}-${highlighted()?.id}` : undefined
          }
          data-testid="command-palette-search"
        />
        <Show
          when={matches().length > 0}
          fallback={
            <div class={styles.empty}>
              <EmptyState
                message={t('table.no-results')}
                data-testid="command-palette-empty"
              />
            </div>
          }
        >
          <ul
            class={styles.results}
            id={listId}
            role="listbox"
            aria-label={t('heading.keyboard-shortcuts')}
          >
            <For each={matches()}>
              {entry => (
                <li
                  id={`${listId}-${entry.id}`}
                  class={styles.option}
                  role="option"
                  aria-selected={entry.id === highlighted()?.id}
                  data-testid="command-palette-option"
                  // The row is not a tab stop: the search field keeps focus for
                  // the whole interaction and the highlight is exposed through
                  // aria-activedescendant (KB-N3).
                  onClick={() => run(entry)}
                >
                  <span>{entry.name}</span>
                  <Show when={entry.shortcut}>
                    {shortcut => (
                      <span class={styles.keys}>
                        ({shortcutLabel(shortcut())})
                      </span>
                    )}
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </Dialog>
  );
};
