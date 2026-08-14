import { createSignal, For, onCleanup, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  type Cell as TanCell,
  type HeaderContext,
  type Table,
} from '@tanstack/solid-table';
import { renderTemplate } from './renderTemplate';
import { LabelledValue } from '../typography/LabelledValue';
import { FieldRow } from '../inputs/FieldRow';
import { BareCheckbox } from '../inputs/BareCheckbox';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  useAccordionItemExpanded,
} from '../accordion/Accordion';
import { t } from '../../../intl';
import type { CardGroup } from './columnTypes';
import styles from './DataTable.module.css';

// A cell's card HEADER slot, or undefined when it belongs to the body.
const headerSlot = <T,>(
  cell: TanCell<T, unknown>
): 'primary' | 'badge' | undefined =>
  cell.column.columnDef.meta?.headerPosition;

// A body cell's group key (undefined = the default/ungrouped group).
const cellGroup = <T,>(cell: TanCell<T, unknown>): string | undefined =>
  (cell.column.columnDef as { cardGroup?: string }).cardGroup;

// The column's header text, for a card field label. Our columns' `header` is
// always a FUNCTION now (columnTypes.ts narrows it to function-only so the text
// reacts to locale changes — kdd/solid-reactivity-pitfalls §14), so call it the
// same way HeaderCell.tsx does via renderTemplate and ColumnSettings.tsx does
// for its row labels. None of our headers read the context argument, so an
// empty one is safe. A non-function header (or none) yields no label — the cell
// then fills its slot unlabelled. Called from a JSX position (never stored in a
// local), so the label re-resolves on a locale change like the value does.
const columnHeaderText = <T,>(
  cell: TanCell<T, unknown>
): JSX.Element | undefined => {
  const header = cell.column.columnDef.header;
  return typeof header === 'function'
    ? header({} as HeaderContext<T, unknown>)
    : undefined;
};

// Whether a cell shows its field label in card view. Default follows the slot
// — header cells unlabelled, body cells labelled — and meta.showLabel overrides
// either (see ColumnMeta.showLabel).
const showsLabel = <T,>(
  cell: TanCell<T, unknown>,
  isHeader: boolean
): boolean => cell.column.columnDef.meta?.showLabel ?? !isHeader;

// A cell's test id — the SAME `cell-<columnId>` table view puts on its <td>
// (e2e/TESTIDS.md), so one row-scoped selector addresses a cell in either
// rendering. Card view is what a tablet renders and what some grids (the
// stocktake and inbound batch editors) render at every width, so a suite
// reaching for a cell there found nothing until this was stamped.
const cellTestId = <T,>(cell: TanCell<T, unknown>): string =>
  `cell-${cell.column.id}`;

// One column's grid TRACK. A number is a fixed `rem` track — a formatted scalar
// whose longest value is known. `{ min, weight }` is `minmax(<min>rem,
// <weight>fr)`: an `fr` is one share of the space left over once every fixed
// track and gap is paid for, so the weighted fields split the remainder in
// their declared ratio (ux-testing/header-field-width.html § weighted columns).
// An undeclared column falls back to a 1fr share off a readable floor.
const cardTrack = <T,>(cell: TanCell<T, unknown>): string => {
  const width = cell.column.columnDef.meta?.cardWidth;
  if (width === undefined) return 'minmax(10rem, 1fr)';
  return typeof width === 'number'
    ? `${width}rem`
    : `minmax(${width.min}rem, ${width.weight}fr)`;
};

// The width, in rem, below which this group's declared template cannot fit —
// every track's minimum plus the 1rem column gaps between them. An explicit
// grid does not wrap, so below this the row would overflow its card; the flow
// falls back to the equal auto-fit tracks instead (see FieldFlow).
const cardTracksMinRem = <T,>(cells: TanCell<T, unknown>[]): number =>
  cells.reduce((total, cell) => {
    const width = cell.column.columnDef.meta?.cardWidth;
    const min =
      width === undefined ? 10 : typeof width === 'number' ? width : width.min;
    return total + min;
  }, 0) + Math.max(0, cells.length - 1);

// A card cell, optionally captioned by the column's string header. Unlabelled,
// the cell fills its slot directly. Labelled, the wrapper follows the slot: a
// HEADER field uses a FieldRow (label beside the control, one line — the card's
// identity row); a BODY field uses a LabelledValue (label above, matching the
// field grid). A generic function (not a sub-component) so the cell's T infers
// cleanly at each call site, matching the other helpers here.
//
// BODY cells carry the cell test id here; a HEADER cell's id goes on the slot
// wrapper the caller renders around it (cardPrimary / cardBadge), which is the
// element standing in for table view's <td> there.
function cellField<T>(
  cell: TanCell<T, unknown>,
  isHeader: boolean
): JSX.Element {
  // The value node — wrapped in a data-mono span for code-like columns
  // (meta.mono) so the monospace font reaches the card too (table view applies
  // it on the <td>). Only the VALUE is wrapped, never the field label.
  const value = () => {
    const content = renderTemplate(
      cell.column.columnDef.cell,
      cell.getContext()
    );
    return cell.column.columnDef.meta?.mono ? (
      <span data-mono="">{content}</span>
    ) : (
      content
    );
  };
  if (!showsLabel(cell, isHeader))
    return isHeader ? (
      value()
    ) : (
      // An unlabelled body cell is a direct child of the auto-fit field grid,
      // so a plain wrapper keeps the same layout — and it has no LabelledValue
      // to carry the id.
      <div data-testid={cellTestId(cell)}>{value()}</div>
    );
  // The label is read as a JSX prop (compiled to a getter), NOT hoisted into a
  // local — hoisting would resolve it once, outside any tracking scope, and
  // freeze the card's field labels in the locale that first painted them.
  return isHeader ? (
    <FieldRow label={columnHeaderText(cell)} labelWidth="auto">
      {value()}
    </FieldRow>
  ) : (
    <LabelledValue
      label={columnHeaderText(cell)}
      // A card's body IS the dense context — ui-standards § inputs keeps a
      // 0.8125rem label for exactly that. Without it the caption renders at
      // the 14px default over a `size="small"` control's 13px text, so the
      // label sat a step ABOVE the value it captions instead of under it.
      size="small"
      // `field`, not the default `card`: a body cell holds a CONTROL, so its
      // caption wants the input's own label→control gap (--input-field-gap,
      // 6px — reconciled to the spec 2026-07-22) rather than the tighter 4px
      // detail-panel gap. At 4px the label crowded the box beneath it.
      variant="field"
      data-testid={cellTestId(cell)}
    >
      {value()}
    </LabelledValue>
  );
}

// A labelled field grid — the body cells of one group, each captioned by
// default (meta.showLabel can drop an individual label), laid out as an
// auto-fitting column grid (ui-standards § tables card layout: two columns on a
// phone card, more on a wide modal card).
//
// A group where at least one column declares meta.cardWidth swaps those equal
// tracks for a DECLARED template — fixed `rem` tracks for formatted scalars, an
// `fr` share for each free-text field — so the leftover width lands where the
// weights say instead of being split evenly over fields that don't need it.
//
// An explicit template does not wrap, so it only holds while the container can
// pay every track's minimum. `narrow` measures that: below the sum of the
// minima the flow reverts to the equal auto-fit tracks, which do wrap. The
// threshold comes from the group's own declarations (so it follows conditional
// columns automatically) rather than a breakpoint literal — a container query
// can't read it, since its condition can't reference a custom property.
// The width past which this group stops growing — every fixed track at its
// size, every weighted track at its declared max, plus the gaps. Beyond it the
// extra space is not distributed at all; the row simply ends and the remainder
// is trailing space.
//
// A GROUP-level ceiling, not a per-field one. Capping each field inside its own
// `fr` track left the track's remainder as a hole in the MIDDLE of the row —
// Location stopping at its max while its track kept growing put a visible gap
// between it and Manufacturer. Capping the grid keeps every track proportional
// and moves the slack to the end, where it reads as margin.
//
// `undefined` when any column declares no width: its track is an open-ended
// sink, so the group has no meaningful ceiling.
const cardTracksMaxRem = <T,>(
  cells: TanCell<T, unknown>[]
): number | undefined => {
  let total = 0;
  for (const cell of cells) {
    const width = cell.column.columnDef.meta?.cardWidth;
    if (width === undefined) return undefined;
    total += typeof width === 'number' ? width : width.max;
  }
  return total + Math.max(0, cells.length - 1);
};

function FieldFlow<T>(props: { cells: TanCell<T, unknown>[] }): JSX.Element {
  const sized = () =>
    props.cells.some(c => c.column.columnDef.meta?.cardWidth !== undefined);
  const [narrow, setNarrow] = createSignal(false);
  const maxRem = () => cardTracksMaxRem(props.cells);

  // Measured on the SHELL, which is size-contained (container-type in the CSS),
  // for two reasons. It holds still: the grid's own width is what we're about
  // to change, so watching that could oscillate. And it stops the template
  // pushing the card wider — a grid's track minima count toward its min-content
  // width, so without containment a 75rem template makes the whole DataTable
  // 75rem and the table scrolls sideways instead of the fields reflowing.
  const watch = (shell: HTMLDivElement) => {
    const rootFontSize = () =>
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const check = () =>
      setNarrow(
        shell.clientWidth < cardTracksMinRem(props.cells) * rootFontSize()
      );
    check();
    const observer = new ResizeObserver(check);
    observer.observe(shell);
    onCleanup(() => observer.disconnect());
  };

  const grid = () => (
    <div
      class={styles.cardFields}
      data-field-widths={sized() ? '' : undefined}
      data-narrow={sized() && narrow() ? '' : undefined}
      style={
        sized()
          ? {
              '--card-field-cols': props.cells.map(cardTrack).join(' '),
              '--card-field-max': maxRem() ? `${maxRem()}rem` : 'none',
            }
          : undefined
      }
    >
      <For each={props.cells}>{cell => cellField(cell, false)}</For>
    </div>
  );

  // The shell exists only for a width-declaring group — an unsized group keeps
  // exactly the DOM (and the intrinsic sizing) it had before.
  return (
    <Show when={sized()} fallback={grid()}>
      <div ref={watch} class={styles.cardFieldsShell}>
        {grid()}
      </div>
    </Show>
  );
}

// A group's fields, boxed in a contained panel (the mockup's tinted "zone")
// when the group asks for it, else the flat field grid.
function GroupFields<T, G extends string>(props: {
  group: CardGroup<T, G>;
  cells: TanCell<T, unknown>[];
}): JSX.Element {
  return (
    <Show when={props.group.panel} fallback={<FieldFlow cells={props.cells} />}>
      <div class={styles.cardPanel}>
        <FieldFlow cells={props.cells} />
      </div>
    </Show>
  );
}

// A group caption — its leading icon and/or label. Rendered only when the group
// declares one or the other (the default primary group has neither).
function GroupCaption<T, G extends string>(props: {
  group: CardGroup<T, G>;
}): JSX.Element {
  return (
    <Show when={props.group.icon || props.group.labelKey}>
      <div class={styles.cardGroupCaption}>
        <Show when={props.group.icon}>
          {icon => <span class={styles.cardGroupIcon}>{icon()()}</span>}
        </Show>
        <Show when={props.group.labelKey}>
          {labelKey => <span>{t(labelKey())}</span>}
        </Show>
      </div>
    </Show>
  );
}

// The collapsed-state preview beside a disclosure header — shown only while the
// accordion item is closed (reads Kobalte's collapsible context via
// useAccordionItemExpanded). Rendered inside the AccordionItem, as a sibling of
// the trigger (NOT inside AccordionContent, which is hidden when collapsed).
function ClosedPreview(props: { children: JSX.Element }): JSX.Element {
  const expanded = useAccordionItemExpanded();
  return (
    <Show when={!expanded()}>
      <div class={styles.cardPreview}>{props.children}</div>
    </Show>
  );
}

// A disclosure group — its fields inside an Accordion (initially open or
// closed). The trigger carries the group's icon + label ("More details" when
// unlabelled); an optional row preview shows beside it while collapsed. The
// wrapper stops click propagation so operating the disclosure never triggers a
// clickable card's onRowClick.
function DisclosureGroup<T, G extends string>(props: {
  group: CardGroup<T, G>;
  cells: TanCell<T, unknown>[];
  row: T;
}): JSX.Element {
  const label = () =>
    props.group.labelKey ? t(props.group.labelKey) : t('table.more-details');
  return (
    <Accordion
      collapsible
      defaultValue={props.group.disclosure === 'open' ? [props.group.key] : []}
    >
      <AccordionItem value={props.group.key}>
        <div onClick={event => event.stopPropagation()}>
          <div class={styles.cardDisclosureHead}>
            <AccordionTrigger class={styles.cardDisclosureTrigger}>
              {/* Reuse the group caption's exact icon+label lead so a
                  disclosure header (Pricing / Other) lines up pixel-for-pixel
                  with a plain caption (Batch) — same markup, same box. The
                  trigger only adds the chevron (and the blue link colour). */}
              <span class={styles.cardGroupCaption}>
                <Show when={props.group.icon}>
                  {icon => <span class={styles.cardGroupIcon}>{icon()()}</span>}
                </Show>
                {label()}
              </span>
            </AccordionTrigger>
            <Show when={props.group.disclosurePreview}>
              {preview => <ClosedPreview>{preview()(props.row)}</ClosedPreview>}
            </Show>
          </div>
          <AccordionContent>
            <GroupFields group={props.group} cells={props.cells} />
          </AccordionContent>
        </div>
      </AccordionItem>
    </Accordion>
  );
}

// Card view — each row is a card (ui-standards § tables): an identity/title
// inline-start and a badge inline-end in the HEADER, then the body laid out as
// GROUPS. A column's body group is `cardGroup`; the table's `cardGroups` list
// declares each group's presentation (icon, panel, disclosure). Ungrouped body
// cells form the default group, rendered first — unpanelled, always shown. A
// group with a `disclosure` sits inside an Accordion; others render inline.
// Selection + row-click mirror the table.
//
// Each card is a full-width table ROW (a <tr> with a single <td>) so card view
// shares the SAME <table> as table view — one scroll container, the header row
// simply hidden. In card view every row is one <td>, so the cell fills the
// width and the card content wraps rather than scrolling.
export function CardView<T, G extends string>(props: {
  table: Table<T>;
  cardGroups?: CardGroup<T, G>[];
  enableSelection: boolean;
  selectionDisabled?: boolean;
  onRowClick?: (row: T) => void;
  /**
   * Semantic text tone (see DataTable's rowTone) — in card view the tone
   * paints the card's IDENTITY title only (a whole-card repaint would
   * recolour field labels and controls). Stamps data-tone on the card row.
   */
  rowTone?: (row: T) => 'info' | 'success' | 'warning' | 'error' | undefined;
}): JSX.Element {
  // The DataTable renders the empty state itself (before this view), so cards
  // always have ≥1 row here — no empty branch.
  const rows = () => props.table.getRowModel().rows;
  const groupKeys = () => new Set((props.cardGroups ?? []).map(g => g.key));
  return (
    <For each={rows()}>
      {row => {
        // Card view drops table-only columns (meta.hideOnCard) at the source,
        // so they appear in neither the header nor the body.
        const cells = () =>
          row
            .getVisibleCells()
            .filter(c => !c.column.columnDef.meta?.hideOnCard);
        const inHeader = (slot: 'primary' | 'badge') =>
          cells().filter(c => headerSlot(c) === slot);
        // Body cells = everything not in the header row.
        const bodyCells = () =>
          cells().filter(c => headerSlot(c) === undefined);
        // The default group: body cells with no group (or a stray group key not
        // declared in cardGroups). Rendered first, unpanelled, always shown.
        const defaultCells = () =>
          bodyCells().filter(c => {
            const g = cellGroup(c);
            return g === undefined || !groupKeys().has(g as G);
          });
        // A declared group's cells, in body order.
        const groupCells = (key: G) =>
          bodyCells().filter(c => cellGroup(c) === key);
        return (
          <tr
            class={`${styles.cardRow} ${props.onRowClick ? styles.rowClickable : ''}`}
            data-selected={row.getIsSelected() ? '' : undefined}
            data-tone={props.rowTone?.(row.original)}
            data-testid="table-row"
            // The row's key, exactly as table view stamps it (TableRow), so a
            // caller can address one row in the DOM in either rendering.
            data-row-key={row.id}
            onClick={() => props.onRowClick?.(row.original)}
          >
            <td class={styles.cardCell}>
              <div class={styles.card}>
                <div class={styles.cardHeader}>
                  <Show when={props.enableSelection}>
                    <BareCheckbox
                      class={styles.cardSelect}
                      aria-label={t('table.select-row')}
                      data-testid="select-row-checkbox"
                      disabled={props.selectionDisabled}
                      checked={row.getIsSelected()}
                      onChange={row.getToggleSelectedHandler()}
                      onClick={event => event.stopPropagation()}
                    />
                  </Show>
                  <div class={styles.cardIdentity}>
                    <For each={inHeader('primary')}>
                      {cell => (
                        // Header slots are unlabelled by default — the cell
                        // fills the slot directly (identity/title inline-start)
                        // — unless meta.showLabel opts a caption in.
                        <div
                          class={styles.cardPrimary}
                          data-testid={cellTestId(cell)}
                        >
                          {cellField(cell, true)}
                        </div>
                      )}
                    </For>
                  </div>
                  <For each={inHeader('badge')}>
                    {cell => (
                      <div
                        class={styles.cardBadge}
                        data-testid={cellTestId(cell)}
                      >
                        {cellField(cell, true)}
                      </div>
                    )}
                  </For>
                </div>
                {/* Card body — divided from the header by a hairline
                    (ui-standards § tables card layout). Only rendered when
                    there are body cells (a header-only card shows no divider).
                    Holds the default (ungrouped) group first, then the declared
                    groups in list order. */}
                <Show when={bodyCells().length > 0}>
                  <div class={styles.cardBody}>
                    {/* Default (ungrouped) group first — unpanelled, always
                        shown. */}
                    <Show when={defaultCells().length > 0}>
                      <FieldFlow cells={defaultCells()} />
                    </Show>
                    {/* Declared groups, in list order. A group with a
                        disclosure goes inside an Accordion; others render inline
                        with an optional caption + panel. Empty groups (no
                        visible cells) render nothing. */}
                    <For each={props.cardGroups}>
                      {group => (
                        <Show when={groupCells(group.key).length > 0}>
                          <Show
                            when={group.disclosure}
                            fallback={
                              <div class={styles.cardGroup}>
                                <GroupCaption group={group} />
                                <GroupFields
                                  group={group}
                                  cells={groupCells(group.key)}
                                />
                              </div>
                            }
                          >
                            <DisclosureGroup
                              group={group}
                              cells={groupCells(group.key)}
                              row={row.original}
                            />
                          </Show>
                        </Show>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </td>
          </tr>
        );
      }}
    </For>
  );
}
