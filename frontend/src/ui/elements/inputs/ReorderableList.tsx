import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
  untrack,
  type Component,
  type JSX,
} from 'solid-js';
import { t } from '../../../intl';
import {
  ChevronDownIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  MenuLinesIcon,
} from '../../icons';
import { moveFocus } from './moveFocus';
import { keepIdentities, moveTo, reorderBy, slotAmong } from './reorderLogic';
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

/** Each move's glyph — one chevron for a step, two for the end. */
const GLYPH: Record<Direction, () => JSX.Element> = {
  top: () => <ChevronsUpIcon />,
  up: () => <ChevronDownIcon class={styles.chevronUp} />,
  down: () => <ChevronDownIcon />,
  bottom: () => <ChevronsDownIcon />,
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
  /**
   * Controls of the row's own, between its text and the move buttons — the
   * common medicines editor's amount fields and remove button. A drag starts
   * only from the handle, so selecting an input's text never moves the row.
   * The row wraps its controls under the text where it runs short.
   */
  rowEnd?: (item: ReorderableItem) => JSX.Element;
}

/*
 * ReorderableList — an ordered set a user rearranges, as a real <ol> of rows
 * carrying a drag handle and four move buttons (spec/ui-standards/components.md
 * § lists). Hand-rolled on pointer events, with NO library: the hard half of a
 * drag list is the accessible fallback, and the four buttons ARE that
 * fallback — a full-keyboard path that needs no grab mode, no live region and
 * no pointer emulation, which is what a dnd library would be bought for.
 *
 * So the handle is a pointer-only affordance: decorative, named by `title` for
 * a mouse user and hidden from assistive tech, which reaches the same outcome
 * through the buttons. Pointer events, not the native HTML5 drag events: a
 * native drag on a touch screen waits for a long press, which nobody finds,
 * while a pressed handle that tracks the finger drags at once, mouse and touch
 * alike (`touch-action: none` keeps the finger from scrolling the page).
 *
 * Controlled: every gesture reports the WHOLE new order and the parent re-feeds
 * `items`. A drag reorders live as it crosses a row, so the list under the
 * pointer is always the order a release commits.
 */
export const ReorderableList = (props: ReorderableListProps): JSX.Element => {
  const [draggingId, setDraggingId] = createSignal<string>();
  /*
   * Focus across a move, the shared registry's (./moveFocus.ts): a reorder
   * moves the row's DOM node and the browser blurs what was focused inside
   * it, so without this a keyboard user pressing "move up" repeatedly would
   * lose focus to the body after the first press — and the keyboard path IS
   * this list's accessible story.
   */
  const focus = moveFocus<Direction>(OPPOSITE);

  /*
   * One object per id, reused while its two lines are unchanged. `<For>` is
   * reference-keyed, so an all-new array — what a parent mapping its own state
   * hands us on every reorder — would re-create every row: losing the focus
   * the move button that caused the reorder was holding, which IS this list's
   * keyboard path, and mid-drag rebuilding every row under the pointer,
   * inputs and all (kdd/solid-reactivity-pitfalls). Held
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
    focus.restore(id, to);
  };

  let list!: HTMLOListElement;
  // The pointer driving the drag. Captured by the <ol>, not the handle: a
  // reorder moves rows' DOM nodes, and a node leaving the document drops the
  // capture it holds, which would end the drag at the first row crossed.
  let dragPointer: number | undefined;
  // How far below the dragged row's top edge it was picked up, so it hangs
  // from the pointer at that point rather than jumping to it.
  let grabOffset = 0;
  // Where the pointer last was: a scroll moves the rows under a still
  // pointer, so the row is placed again from here without a pointer event.
  let pointerY = 0;

  /*
   * The drag is drawn, not just committed: the row in hand follows the
   * pointer (a translate from its own slot), and the rows it passes slide
   * into the space it left. Positions are px from layout (offsetTop, against
   * the <ol>, which is positioned), so a row's own slide never feeds back
   * into where the dragged row belongs — the one px use here, as measured
   * geometry is in the tab bar's indicator.
   */
  const rowEl = (id: string) =>
    list.querySelector<HTMLElement>(`[data-reorder-id="${CSS.escape(id)}"]`);
  const listTop = () => list.getBoundingClientRect().top + list.clientTop;

  const EASE = 'var(--motion-fast) ease';
  // Animate a row's transform back to nothing, then leave no inline style
  // behind, so the stylesheet's own transition (the lift's shadow) applies
  // again. Under reduced motion --motion-fast is 0s and no transitionend
  // fires, so it is cleared at once.
  const settle = (row: HTMLElement, transition: string) => {
    row.style.transition = transition;
    row.style.transform = '';
    const clear = () => {
      if (row.dataset.dragging !== undefined) return;
      row.style.transition = '';
    };
    if (
      getComputedStyle(row)
        .transitionDuration.split(',')
        .every(d => parseFloat(d) === 0)
    )
      clear();
    else row.addEventListener('transitionend', clear, { once: true });
  };

  // Hang the dragged row from the pointer, wherever its slot now is, but
  // never past the list's own ends: dragged beyond the last row it stops at
  // the last slot. Unbounded, a row carried down would lengthen what scrolls
  // it, and the auto-scroll would chase it down without end. Its shadow keeps
  // the stylesheet's transition, so the lift fades in.
  const float = (row: HTMLElement) => {
    const wanted = pointerY - grabOffset - listTop() - row.offsetTop;
    const by = Math.min(
      Math.max(wanted, -row.offsetTop),
      list.clientHeight - row.offsetTop - row.offsetHeight
    );
    row.style.transition = `box-shadow ${EASE}`;
    row.style.transform = `translateY(${by}px)`;
  };

  // A row moved by a reorder starts where it was and slides to its new slot.
  const slide = (row: HTMLElement, fromTop: number) => {
    const by = fromTop - row.offsetTop;
    if (by === 0) return;
    row.style.transition = 'none';
    row.style.transform = `translateY(${by}px)`;
    void row.offsetHeight; // start the slide from there, not from the slot
    settle(row, `transform ${EASE}`);
  };

  // The dragged row's slot for where the pointer is now, and the row hung
  // there: on every pointer move, and on every scroll while it drags.
  const place = () => {
    const dragged = draggingId();
    if (dragged === undefined || props.disabled) return;
    const row = rowEl(dragged);
    if (!row) return;
    const top = listTop();
    const others = ids().flatMap(id => {
      const el = id === dragged ? null : rowEl(id);
      return el ? [{ el, top: el.offsetTop }] : [];
    });
    const slot = slotAmong(
      others.map(other => top + other.top + other.el.offsetHeight / 2),
      pointerY - grabOffset + row.offsetHeight / 2
    );
    commit(reorderBy(ids(), dragged, slot));
    // Solid has moved the rows by now; those that moved slide there.
    for (const other of others) slide(other.el, other.top);
    float(row);
  };

  /*
   * Near the top or bottom edge of whatever scrolls the list (the dialog body
   * of a long list, or the page), it scrolls, faster the closer the pointer:
   * the handle holds the touch, so a finger can't scroll the list itself, and
   * a long list's far end is otherwise out of reach of a drag. The scroll
   * re-places the row through the scroll listener below.
   */
  let autoScroll: number | undefined;
  const scroller = (): HTMLElement => {
    for (let el = list.parentElement; el; el = el.parentElement) {
      const overflow = getComputedStyle(el).overflowY;
      if (
        (overflow === 'auto' || overflow === 'scroll') &&
        el.scrollHeight > el.clientHeight
      )
        return el;
    }
    return document.scrollingElement as HTMLElement;
  };
  const scrollStep = () => {
    autoScroll = undefined;
    if (draggingId() === undefined) return;
    const area = scroller();
    const isPage = area === document.scrollingElement;
    const rect = isPage
      ? { top: 0, bottom: window.innerHeight }
      : area.getBoundingClientRect();
    // The edge zone, three lines of text tall, in px from the root size.
    const zone =
      3 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, window.innerHeight);
    // Only toward list still out of view, and no further than its end: the
    // scroll is for reaching rows, not for what lies past the list.
    const shown = list.getBoundingClientRect();
    const by =
      pointerY < top + zone
        ? Math.max(
            -Math.ceil(((top + zone - pointerY) / zone) * 12),
            Math.min(shown.top - top, 0)
          )
        : pointerY > bottom - zone
          ? Math.min(
              Math.ceil(((pointerY - (bottom - zone)) / zone) * 12),
              Math.max(shown.bottom - bottom, 0)
            )
          : 0;
    if (by !== 0) area.scrollBy(0, by);
    autoScroll = requestAnimationFrame(scrollStep);
  };

  const onScroll = () => place();

  const stopDrag = () => {
    const dragged = draggingId();
    if (dragged === undefined) return;
    if (dragPointer !== undefined && list.hasPointerCapture(dragPointer))
      list.releasePointerCapture(dragPointer);
    dragPointer = undefined;
    if (autoScroll !== undefined) cancelAnimationFrame(autoScroll);
    autoScroll = undefined;
    document.removeEventListener('scroll', onScroll, true);
    setDraggingId(undefined);
    // Set down: the row settles from under the pointer into its slot, its
    // shadow fading as it does. Whatever order it reached stays — a release
    // and a cancelled pointer alike.
    const row = rowEl(dragged);
    if (row) settle(row, `transform ${EASE}, box-shadow ${EASE}`);
  };

  const startDrag = (event: PointerEvent, id: string) => {
    if (props.disabled || dragPointer !== undefined) return;
    // Primary button only; a touch or pen press reports button 0 too.
    if (event.button !== 0) return;
    const row = rowEl(id);
    if (!row) return;
    // No text selection, and no focus change, from the press.
    event.preventDefault();
    dragPointer = event.pointerId;
    list.setPointerCapture(event.pointerId);
    grabOffset = event.clientY - row.getBoundingClientRect().top;
    pointerY = event.clientY;
    setDraggingId(id);
    float(row);
    // Capture phase: a scroll doesn't bubble, and the scroller may be any
    // ancestor, the dialog body or the page.
    document.addEventListener('scroll', onScroll, true);
    autoScroll = requestAnimationFrame(scrollStep);
  };

  const dragOver = (event: PointerEvent) => {
    if (event.pointerId !== dragPointer) return;
    pointerY = event.clientY;
    place();
  };

  const endDrag = (event: PointerEvent) => {
    if (event.pointerId === dragPointer) stopDrag();
  };

  // Disabled mid-drag — a save started with the row still in hand: the drag
  // ends where it is, so nothing reorders the list after the save has read
  // it. And a list torn down mid-drag leaves no listener behind.
  createEffect(() => {
    if (props.disabled) untrack(stopDrag);
  });
  onCleanup(stopDrag);

  // Keyed by direction, so a move button reads its own name; a memo because
  // every row reads this and the object is otherwise rebuilt per read.
  const names = createMemo(() => ({
    dragHandle: props.labels?.dragHandle ?? t('reorder.drag-handle'),
    top: props.labels?.moveTop ?? t('reorder.move-to-top'),
    up: props.labels?.moveUp ?? t('reorder.move-up'),
    down: props.labels?.moveDown ?? t('reorder.move-down'),
    bottom: props.labels?.moveBottom ?? t('reorder.move-to-bottom'),
  }));

  // One row's move button: the direction picks its name, its glyph and the
  // end it is dead at (a step up and a jump to the top both die on row one).
  const MoveButton: Component<{
    item: ReorderableItem;
    index: number;
    to: Direction;
  }> = button => {
    const dead = () =>
      button.to === 'top' || button.to === 'up'
        ? button.index === 0
        : button.index === rows().length - 1;
    return (
      <button
        type="button"
        class={styles.moveButton}
        aria-label={names()[button.to]}
        ref={focus.ref(button.item.id, button.to)}
        disabled={props.disabled || dead()}
        onClick={() => move(button.item.id, button.to)}
      >
        {GLYPH[button.to]()}
      </button>
    );
  };

  return (
    <ol
      ref={list}
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      aria-label={props.label}
      data-testid={props.testId}
      data-dragging={draggingId() !== undefined ? '' : undefined}
      onPointerMove={dragOver}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    >
      <For each={rows()}>
        {(item, index) => (
          <li
            class={styles.row}
            data-reorder-id={item.id}
            data-row-end={props.rowEnd ? '' : undefined}
            data-dragging={draggingId() === item.id ? '' : undefined}
          >
            <span
              class={styles.handle}
              // No grab hint on a handle that can't be grabbed.
              title={props.disabled ? undefined : names().dragHandle}
              aria-hidden="true"
              data-testid="reorder-drag-handle"
              data-disabled={props.disabled ? '' : undefined}
              onPointerDown={event => startDrag(event, item.id)}
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
            <Show when={props.rowEnd}>
              {rowEnd => <span class={styles.rowEnd}>{rowEnd()(item)}</span>}
            </Show>
            <span class={styles.actions}>
              <MoveButton item={item} index={index()} to="top" />
              <MoveButton item={item} index={index()} to="up" />
              <MoveButton item={item} index={index()} to="down" />
              <MoveButton item={item} index={index()} to="bottom" />
            </span>
          </li>
        )}
      </For>
    </ol>
  );
};
