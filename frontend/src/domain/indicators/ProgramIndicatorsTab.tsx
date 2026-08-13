import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  Show,
  onCleanup,
  type Component,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { useSearchParams } from '@solidjs/router';
import { t, localisedDate } from '../../intl';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '../../ui/icons';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../ui/layout/Form/FormColumn';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { Stack } from '../../ui/layout/Stack/Stack';
import { HStack } from '../../ui/layout/Stack/HStack';
import {
  mergeIndicatorLines,
  saveIndicatorValue,
  type IndicatorCell,
  type IndicatorCustomerRow,
  type IndicatorNode,
} from './indicators';
import styles from './ProgramIndicatorsTab.module.css';

// The shared Indicators tab (spec/internal-orders S3 § Indicators tab,
// AC-I4–I11, owns the surface; spec/requisitions § indicator values consumes
// it with no customer breakdown and the requisition's editability).
// Left: the merged line list (one entry per code), selection URL-persisted.
// Right: the selected line as the standard sectioned edit form — the cells as
// label-above inputs down two columns (the shape the custom-fields tab and the
// stock/patient detail forms use), the inactive-line notice, the gated customer
// breakdown as a DataTable, and Previous/Next.

// One cell input — a stored value row edited in place, saved 500 ms after the
// last keystroke (AC-I5). Number vs text by the cell's declared type; a save
// error shows as field feedback. Local state holds the typed value (no refetch
// on save), so the input is its own source of truth for its lifetime; what it
// STARTS from is the cell it is handed, which is why a landed save is reported
// back to the owner of the nodes (#957 — otherwise the next mount of this cell
// shows the figure the screen loaded with).
const IndicatorCellInput: Component<{
  storeId: string;
  cell: IndicatorCell;
  disabled: boolean;
  autofocus: boolean;
  onSaved: (valueId: string, value: string) => void;
}> = props => {
  const [value, setValue] = createSignal(props.cell.value);
  const [error, setError] = createSignal<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const save = (next: string) => {
    timer = undefined;
    void saveIndicatorValue(props.storeId, props.cell.valueId, next).then(
      result => {
        if (result.kind === 'error') setError(result.message);
        else if (result.kind === 'saved')
          props.onSaved(props.cell.valueId, result.value);
      }
    );
  };

  const commit = (next: string) => {
    setValue(next);
    setError(undefined);
    clearTimeout(timer);
    timer = setTimeout(() => save(next), 500);
  };
  // A pending edit is FLUSHED on unmount, not dropped: stepping to another
  // line (or leaving the tab) inside the debounce window would otherwise
  // discard the keystrokes that never reached the server.
  onCleanup(() => {
    if (timer === undefined) return;
    clearTimeout(timer);
    save(value());
  });

  return (
    <Show
      when={props.cell.type === 'NUMBER'}
      fallback={
        <TextField
          label={props.cell.label}
          autofocus={props.autofocus}
          value={value()}
          disabled={props.disabled}
          error={error()}
          onInput={e => commit(e.currentTarget.value)}
        />
      }
    >
      {/* A number cell is anything the server can parse as f64 (contract ›
          indicator values): decimals and negatives included — the seeded
          customer sums are themselves f64. The input must not be narrower
          than the rule it mirrors, so it takes both. */}
      <NumberField
        label={props.cell.label}
        autofocus={props.autofocus}
        allowNegative
        decimalLimit={10}
        value={value() === '' ? undefined : Number(value())}
        disabled={props.disabled}
        error={error()}
        onChange={next => commit(next === undefined ? '' : String(next))}
      />
    </Show>
  );
};

export const ProgramIndicatorsTab: Component<{
  storeId: string;
  /** The programIndicators nodes (definitions + this period's values). */
  nodes: readonly IndicatorNode[];
  /** The record's editability — read-only disables every cell (AC-I8). */
  editable: boolean;
  /** Both customer-statistics prefs on → the customer breakdown (AC-I10);
   *  always false on the response side (no breakdown on any config). */
  showCustomerBreakdown: boolean;
  /** A landed save — the owner writes the figure back into `nodes` (mutating
   *  the resource they came from) so the tab keeps showing what was saved. */
  onSaved: (valueId: string, value: string) => void;
}> = props => {
  // The merged lines live in a STORE, mirrored from the nodes with `reconcile`
  // (kdd/solid-reactivity-pitfalls § 6 and § no remounts, rule 2): a saved
  // value flowing back in then lands as ONE leaf write instead of a wholesale
  // array swap, so every line row and cell input keeps its identity — the
  // input being typed in is never torn down (and never loses focus) when its
  // own save comes home.
  const [entries, setEntries] = createStore(mergeIndicatorLines(props.nodes));
  createEffect(
    on(
      () => props.nodes,
      nodes =>
        setEntries(reconcile(mergeIndicatorLines(nodes), { key: 'code' })),
      { defer: true }
    )
  );

  const [params, setParams] = useSearchParams<{ indicatorLine?: string }>();
  const selectedIndex = createMemo(() => {
    const index = entries.findIndex(
      entry => entry.code === params.indicatorLine
    );
    return index >= 0 ? index : 0;
  });
  const selected = () => entries[selectedIndex()];
  const select = (code: string) => setParams({ indicatorLine: code });
  const step = (delta: number) => {
    const next = entries[selectedIndex() + delta];
    if (next) select(next.code);
  };

  // The cells split down two columns — read down column one, then two — the
  // same shape the custom-fields tab lays its fields out in.
  const cells = () => selected()?.cells ?? [];
  const firstColumn = createMemo(() =>
    cells().slice(0, Math.ceil(cells().length / 2))
  );
  const secondColumn = createMemo(() =>
    cells().slice(Math.ceil(cells().length / 2))
  );

  // The breakdown's columns follow the displayed cells (AC-I10), so they are
  // rebuilt per selection — memoized because TanStack keys its own internal
  // caches off this array's identity (kdd/solid-reactivity-pitfalls § 8).
  const breakdownColumns = createMemo(
    (): Column<IndicatorCustomerRow, never>[] => [
      { c: { key: 'name' }, header: () => t('label.name') },
      ...cells().map(cell => ({
        c: {
          accessor: (row: IndicatorCustomerRow) =>
            row.values[cell.columnId] ?? '',
          id: cell.columnId,
        },
        header: () => cell.label,
        meta: {
          align: cell.type === 'NUMBER' ? ('right' as const) : undefined,
        },
      })),
      {
        c: {
          accessor: (row: IndicatorCustomerRow) =>
            row.datetime ? localisedDate(row.datetime) : '',
          id: 'date',
        },
        header: () => t('label.date'),
      },
    ]
  );

  return (
    <Show
      when={entries.length > 0}
      fallback={<EmptyState message={t('error.no-indicators')} />}
    >
      {/* `padded` supplies the edge padding: the host is a fillBody detail page
          (full-bleed for its line table), so this tab has none to inherit —
          the same container the custom-fields tab opens with. */}
      <ContentContainer size="wide" padded>
        <div class={styles.tab}>
          <FormSection title={t('label.indicators')} class={styles.lines}>
            <nav class={styles.lineList} aria-label={t('label.indicators')}>
              <For each={entries}>
                {entry => (
                  <button
                    type="button"
                    class={styles.lineButton}
                    aria-current={
                      entry.code === selected()?.code ? 'true' : undefined
                    }
                    data-selected={
                      entry.code === selected()?.code ? '' : undefined
                    }
                    data-testid={`indicator-line-${entry.code}`}
                    onClick={() => select(entry.code)}
                  >
                    {`${entry.code} - ${entry.name}`}
                  </button>
                )}
              </For>
            </nav>
          </FormSection>

          <Show when={selected()}>
            {entry => (
              <Stack gap="lg" class={styles.editor}>
                <FormSection
                  title={`${entry().code} - ${entry().name}`}
                  class={styles.fields}
                >
                  <FormColumns>
                    <FormColumn minWidth="16rem">
                      <Stack gap="md">
                        <For each={firstColumn()}>
                          {(cell, index) => (
                            <IndicatorCellInput
                              storeId={props.storeId}
                              cell={cell}
                              disabled={!props.editable || !entry().isActive}
                              autofocus={index() === 0}
                              onSaved={props.onSaved}
                            />
                          )}
                        </For>
                      </Stack>
                    </FormColumn>
                    {/* Only when it has cells: an empty column would still
                        claim its half of the row and squeeze the filled one. */}
                    <Show when={secondColumn().length > 0}>
                      <FormColumn minWidth="16rem">
                        <Stack gap="md">
                          <For each={secondColumn()}>
                            {cell => (
                              <IndicatorCellInput
                                storeId={props.storeId}
                                cell={cell}
                                disabled={!props.editable || !entry().isActive}
                                autofocus={false}
                                onSaved={props.onSaved}
                              />
                            )}
                          </For>
                        </Stack>
                      </FormColumn>
                    </Show>
                  </FormColumns>

                  <Show when={!entry().isActive}>
                    <Alert severity="info">
                      {t('label.indicator-no-longer-active')}
                    </Alert>
                  </Show>
                </FormSection>

                <Show
                  when={
                    props.showCustomerBreakdown && entry().customerRows.length
                  }
                >
                  {/* A read-only breakdown inside a form
                      tab: no shell for a full-screen
                      toggle to claim. */}
                  <DataTable
                    columns={breakdownColumns()}
                    rows={[...entry().customerRows]}
                    rowKey={row => row.id}
                    showFullScreen={false}
                  />
                </Show>

                <HStack gap="sm" justify="end">
                  <Button
                    variant="secondary"
                    icon={<ChevronLeftIcon />}
                    disabled={selectedIndex() === 0}
                    onClick={() => step(-1)}
                  >
                    {t('button.previous')}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<ChevronRightIcon />}
                    iconPosition="end"
                    disabled={selectedIndex() === entries.length - 1}
                    onClick={() => step(1)}
                  >
                    {t('button.next')}
                  </Button>
                </HStack>
              </Stack>
            )}
          </Show>
        </div>
      </ContentContainer>
    </Show>
  );
};
