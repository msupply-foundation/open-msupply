import {
  createMemo,
  createSignal,
  For,
  Show,
  onCleanup,
  type Component,
} from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { t, localisedDate } from '../../intl';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Button } from '../../ui/elements/buttons/Button';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import {
  mergeIndicatorLines,
  saveIndicatorValue,
  type IndicatorCell,
  type IndicatorNode,
} from './indicators';
import styles from './ProgramIndicatorsTab.module.css';

// The shared Indicators tab (spec/internal-orders S3 § Indicators tab,
// AC-I4–I11, owns the surface; spec/requisitions § indicator values consumes
// it with no customer breakdown and the requisition's editability).
// Left: the merged line list (one entry per code), selection URL-persisted.
// Right: a labelled input per displayed cell (autosaving as typed), an
// inactive-line caption, the gated customer breakdown, and Previous/Next.

// One cell input — a stored value row edited in place, saved 500 ms after the
// last keystroke (AC-I5). Number vs text by the cell's declared type; a save
// error shows as field feedback. Local state holds the typed value (no refetch
// on save), so the input is its own source of truth for its lifetime (cells are
// keyed by valueId, so switching lines mounts fresh inputs).
const IndicatorCellInput: Component<{
  storeId: string;
  cell: IndicatorCell;
  disabled: boolean;
  autofocus: boolean;
}> = props => {
  const [value, setValue] = createSignal(props.cell.value);
  const [error, setError] = createSignal<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const commit = (next: string) => {
    setValue(next);
    setError(undefined);
    clearTimeout(timer);
    timer = setTimeout(() => {
      void saveIndicatorValue(props.storeId, props.cell.valueId, next).then(
        result => {
          if (result.kind === 'error') setError(result.message);
        }
      );
    }, 500);
  };
  onCleanup(() => clearTimeout(timer));

  return (
    <FieldRow label={props.cell.label}>
      <Show
        when={props.cell.type === 'NUMBER'}
        fallback={
          <TextField
            label={props.cell.label}
            hideLabel
            width="full"
            autofocus={props.autofocus}
            value={value()}
            disabled={props.disabled}
            error={error()}
            onInput={e => commit(e.currentTarget.value)}
          />
        }
      >
        <NumberField
          label={props.cell.label}
          hideLabel
          autofocus={props.autofocus}
          value={value() === '' ? undefined : Number(value())}
          disabled={props.disabled}
          error={error()}
          onChange={next => commit(next === undefined ? '' : String(next))}
        />
      </Show>
    </FieldRow>
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
}> = props => {
  const entries = createMemo(() => mergeIndicatorLines(props.nodes));
  const [params, setParams] = useSearchParams<{ indicatorLine?: string }>();

  const selectedIndex = createMemo(() => {
    const list = entries();
    const index = list.findIndex(entry => entry.code === params.indicatorLine);
    return index >= 0 ? index : 0;
  });
  const selected = () => entries()[selectedIndex()];
  const select = (code: string) => setParams({ indicatorLine: code });
  const step = (delta: number) => {
    const next = entries()[selectedIndex() + delta];
    if (next) select(next.code);
  };

  return (
    <Show
      when={entries().length > 0}
      fallback={<EmptyState message={t('error.no-indicators')} />}
    >
      <div class={styles.tab}>
        <div class={styles.lines}>
          <For each={entries()}>
            {entry => (
              <button
                type="button"
                class={styles.lineButton}
                data-selected={entry.code === selected()?.code ? '' : undefined}
                data-testid={`indicator-line-${entry.code}`}
                onClick={() => select(entry.code)}
              >
                {`${entry.code} - ${entry.name}`}
              </button>
            )}
          </For>
        </div>

        <Show when={selected()}>
          {entry => (
            <div class={styles.editor}>
              <For each={entry().cells}>
                {(cell, index) => (
                  <IndicatorCellInput
                    storeId={props.storeId}
                    cell={cell}
                    disabled={!props.editable || !entry().isActive}
                    autofocus={index() === 0}
                  />
                )}
              </For>

              <Show when={!entry().isActive}>
                <span class={styles.caption}>
                  {t('label.indicator-no-longer-active')}
                </span>
              </Show>

              <Show
                when={
                  props.showCustomerBreakdown && entry().customerRows.length
                }
              >
                <div class={styles.customerScroll}>
                  <table class={styles.customerTable}>
                    <thead>
                      <tr>
                        <th>{t('label.name')}</th>
                        <For each={entry().cells}>
                          {cell => (
                            <th
                              data-align={
                                cell.type === 'NUMBER' ? 'right' : undefined
                              }
                            >
                              {cell.label}
                            </th>
                          )}
                        </For>
                        <th>{t('label.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={entry().customerRows}>
                        {row => (
                          <tr>
                            <td>{row.name}</td>
                            <For each={entry().cells}>
                              {cell => (
                                <td
                                  data-align={
                                    cell.type === 'NUMBER'
                                      ? 'right'
                                      : undefined
                                  }
                                >
                                  {row.values[cell.columnId] ?? ''}
                                </td>
                              )}
                            </For>
                            <td>
                              {row.datetime ? localisedDate(row.datetime) : ''}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>

              <div class={styles.nav}>
                <Button
                  variant="secondary"
                  disabled={selectedIndex() === 0}
                  onClick={() => step(-1)}
                >
                  {t('button.previous')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={selectedIndex() === entries().length - 1}
                  onClick={() => step(1)}
                >
                  {t('button.next')}
                </Button>
              </div>
            </div>
          )}
        </Show>
      </div>
    </Show>
  );
};
