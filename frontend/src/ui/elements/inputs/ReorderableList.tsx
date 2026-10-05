import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import {
  ChevronDownIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  MenuLinesIcon,
} from '../../icons';
import { keepIdentities, moveTo, reorderBy } from './reorderLogic';
import styles from './ReorderableList.module.css';

export interface ReorderableItem {
  /** Stable key — what the committed order is expressed in. */
  id: string;
  /** The row's primary line. */
  label: string;
  /** A muted second line under the label (the dose's course). */
  description?: string;
}

/**
 * Accessible names for the row controls. Each defaults to the host's own
 * string; a surface with its own catalogue — a plugin's configuration editor —
 * passes its own, as `Combobox`'s `noResultsMessage` does.
 */
export interface ReorderableListLabels {
  dragHandle?: string;
  moveTop?: string;
  moveUp?: string;
  moveDown?: string;
  moveBottom?: string;
}

/** The four button moves. */
type Direction = 'top' | 'up' | 'down' | 'bottom';

/** Where focus goes when the pressed button is disabled by its own move. */
const OPPOSITE: Record<Direction, Direction> = {
  top: 'bottom',
  up: 'down',
  down: 'up',
  bottom: 'top',
};

export interface ReorderableListProps {
  /**
   * The rows, in order. Rebuild them freely — identity is held by `id`
   * internally, so a reorder is a DOM move however the array was built.
   */
  items: ReorderableItem[];
  /** The whole new order, by id — the list is controlled. */
  onReorder: (orderedIds: string[]) => void;
  /** Accessible name for the list. */
  label: string;
  /** Number each row with its 1-based position. */
  showPosition?: boolean;
  labels?: ReorderableListLabels;
  disabled?: boolean;
  /** `data-testid` on the list element (locale-stable test hook). */
  testId?: string;
  class?: string;
}

/*
 * ReorderableList — an ordered set a user rearranges, as a real <ol> of rows
 * carrying a drag handle and four move buttons (spec/ui-standards/components.md
 * § lists). Hand-rolled on the native HTML5 drag-and-drop events, with NO
 * library: the hard half of a drag list is the accessible fallback, and the
 * four buttons ARE that fallback — a full-keyboard path that needs no grab
 * mode, no live region and no pointer emulation, which is what a dnd library
 * would be bought for.
 *
 * So the handle is a pointer-only affordance: decorative, named by `title` for
 * a mouse user and hidden from assistive tech, which reaches the same outcome
 * through the buttons. Touch has no native drag either, and needs none for the
 * same reason.
 *
 * Controlled: every gesture reports the WHOLE new order and the parent re-feeds
 * `items`. A drag reorders live as it crosses a row, so the list under the
 * cursor is always the order a drop would commit.
 */
export const ReorderableList = (props: ReorderableListProps): JSX.Element => {
  const [draggingId, setDraggingId] = createSignal<string>();

  /*
   * The move buttons, by row id and direction. A reorder MOVES the row's DOM
   * node, and Chromium blurs whatever was focused inside a node it detaches
   * and re-inserts — so a keyboard user pressing "move up" repeatedly would
   * lose focus to the body after the first press, and the keyboard path IS
   * this list's accessible story. After each move focus returns to the same
   * button of the same row, or to its counterpart where the row has reached
   * the end and the button it pressed is now disabled.
   */
  const buttons = new Map<string, HTMLButtonElement>();
  const buttonKey = (id: string, to: Direction) => `${id}|${to}`;
  const refocus = (id: string, to: Direction) => {
    const pressed = buttons.get(buttonKey(id, to));
    if (pressed?.isConnected && !pressed.disabled) {
      pressed.focus();
      return;
    }
    // At the end it just reached, the opposite button is the one still live.
    buttons.get(buttonKey(id, OPPOSITE[to]))?.focus();
  };

  /*
   * One object per id, reused while its two lines are unchanged. `<For>` is
   * reference-keyed, so an all-new array — what a parent mapping its own state
   * hands us on every reorder — would re-create every row: losing the focus
   * the move button that caused the reorder was holding, which IS this list's
   * keyboard path, and mid-drag destroying the dragged <li>, which fires
   * `dragend` and abandons the gesture (kdd/solid-reactivity-pitfalls). Held
   * here rather than asked of each consumer: two consumers, two hand-rolled
   * caches, before this moved in.
   */
  let held: ReadonlyMap<string, ReorderableItem> = new Map();
  const rows = createMemo(() => {
    const kept = keepIdentities(held, props.items);
    held = kept.held;
    return kept.items;
  });

  const ids = () => rows().map(item => item.id);
  const commit = (next: string[]) => {
    const current = ids();
    if (
      next.length === current.length &&
      next.every((id, i) => id === current[i])
    )
      return;
    props.onReorder(next);
  };

  const move = (id: string, to: Direction) => {
    commit(moveTo(ids(), id, to));
    // Solid has flushed the parent's update by now, so the row has moved.
    refocus(id, to);
  };

  const names = () => ({
    dragHandle: props.labels?.dragHandle ?? t('reorder.drag-handle'),
    moveTop: props.labels?.moveTop ?? t('reorder.move-to-top'),
    moveUp: props.labels?.moveUp ?? t('reorder.move-up'),
    moveDown: props.labels?.moveDown ?? t('reorder.move-down'),
    moveBottom: props.labels?.moveBottom ?? t('reorder.move-to-bottom'),
  });

  return (
    <ol
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      aria-label={props.label}
      data-testid={props.testId}
    >
      <For each={rows()}>
        {(item, index) => (
          <li
            class={styles.row}
            draggable={!props.disabled}
            data-dragging={draggingId() === item.id ? '' : undefined}
            onDragStart={event => {
              if (props.disabled) return;
              setDraggingId(item.id);
              // A payload is required for Firefox to start the drag at all.
              event.dataTransfer?.setData('text/plain', item.id);
              if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setDraggingId(undefined)}
            onDragOver={event => {
              const dragged = draggingId();
              if (props.disabled || dragged === undefined) return;
              // Without this the drop is refused and no reorder lands.
              event.preventDefault();
              if (dragged !== item.id)
                commit(reorderBy(ids(), dragged, index()));
            }}
            onDrop={event => {
              event.preventDefault();
              setDraggingId(undefined);
            }}
          >
            <span
              class={styles.handle}
              title={names().dragHandle}
              aria-hidden="true"
            >
              <MenuLinesIcon />
            </span>
            <Show when={props.showPosition}>
              {/*
                Decorative, like the handle above it: the <ol>/<li> carries the
                position for assistive tech already, so a named number would be
                read twice — and a <span> is role=generic, which ARIA forbids
                naming, so there is no sound way to label it anyway.
              */}
              <span class={styles.position} aria-hidden="true">
                {index() + 1}
              </span>
            </Show>
            <span class={styles.text}>
              <span class={styles.label}>{item.label}</span>
              <Show when={item.description}>
                <span class={styles.description}>{item.description}</span>
              </Show>
            </span>
            <span class={styles.actions}>
              <button
                type="button"
                class={styles.moveButton}
                aria-label={names().moveTop}
                ref={el => buttons.set(buttonKey(item.id, 'top'), el)}
                disabled={props.disabled || index() === 0}
                onClick={() => move(item.id, 'top')}
              >
                <ChevronsUpIcon />
              </button>
              <button
                type="button"
                class={styles.moveButton}
                aria-label={names().moveUp}
                ref={el => buttons.set(buttonKey(item.id, 'up'), el)}
                disabled={props.disabled || index() === 0}
                onClick={() => move(item.id, 'up')}
              >
                <ChevronDownIcon class={styles.chevronUp} />
              </button>
              <button
                type="button"
                class={styles.moveButton}
                aria-label={names().moveDown}
                ref={el => buttons.set(buttonKey(item.id, 'down'), el)}
                disabled={props.disabled || index() === rows().length - 1}
                onClick={() => move(item.id, 'down')}
              >
                <ChevronDownIcon />
              </button>
              <button
                type="button"
                class={styles.moveButton}
                aria-label={names().moveBottom}
                ref={el => buttons.set(buttonKey(item.id, 'bottom'), el)}
                disabled={props.disabled || index() === rows().length - 1}
                onClick={() => move(item.id, 'bottom')}
              >
                <ChevronsDownIcon />
              </button>
            </span>
          </li>
        )}
      </For>
    </ol>
  );
};
