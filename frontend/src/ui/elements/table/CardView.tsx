import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  flexRender,
  type Cell as TanCell,
  type Table,
} from '@tanstack/solid-table';
import { LabelledValue } from '../typography/LabelledValue';
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

// The column's header text, for a field label. Headers may be a string or
// JSX/function; only the string case yields a readable label (our columns use
// strings), else no label.
const columnHeaderText = <T,>(
  cell: TanCell<T, unknown>
): string | undefined => {
  const header = cell.column.columnDef.header;
  return typeof header === 'string' ? header : undefined;
};

// A labelled field grid — the body cells of one group, each as a
// LabelledValue (label above value), laid out as an auto-fitting column grid
// (ui-standards § tables card layout: two columns on a phone card, more on a
// wide modal card).
function FieldFlow<T>(props: { cells: TanCell<T, unknown>[] }): JSX.Element {
  return (
    <div class={styles.cardFields}>
      <For each={props.cells}>
        {cell => (
          <LabelledValue label={columnHeaderText(cell)}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </LabelledValue>
        )}
      </For>
    </div>
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
              <Show when={props.group.icon}>
                {icon => <span class={styles.cardGroupIcon}>{icon()()}</span>}
              </Show>
              {label()}
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
  onRowClick?: (row: T) => void;
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
            data-testid="table-row"
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
                      checked={row.getIsSelected()}
                      onChange={row.getToggleSelectedHandler()}
                      onClick={event => event.stopPropagation()}
                    />
                  </Show>
                  <div class={styles.cardIdentity}>
                    <For each={inHeader('primary')}>
                      {cell => (
                        // Header slots are never labelled — the cell fills the
                        // slot directly (identity/title inline-start).
                        <div class={styles.cardPrimary}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      )}
                    </For>
                  </div>
                  <For each={inHeader('badge')}>
                    {cell => (
                      <div class={styles.cardBadge}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
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
