import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import {
  UpdateIndicatorValue,
  type ProgramIndicatorValuesResult,
} from './indicators.generated';

// Shared Indicators-tab domain logic (spec/internal-orders S3 § Indicators
// tab owns the surface; spec/requisitions § indicator values consumes it):
// the line merge (AC-I4) and the per-cell save (AC-I5–I7).

type IndicatorConnector = Extract<
  ProgramIndicatorValuesResult['programIndicators'],
  { __typename: 'ProgramIndicatorConnector' }
>;
export type IndicatorNode = IndicatorConnector['nodes'][number];
type LineAndColumns = IndicatorNode['lineAndColumns'][number];

// One editable cell in a merged line — a stored value row (the edit target),
// its display label, declared type (drives the input), and current value.
export type IndicatorCell = {
  valueId: string;
  columnId: string;
  label: string;
  type: 'NUMBER' | 'STRING';
  value: string;
};

// One customer-breakdown row for a line (AC-I10): a supplied customer store,
// its figures per column, and the period-end date (or null).
export type IndicatorCustomerRow = {
  /** Unique per ROW, not per customer: a merged line repeats its customers
   *  once per source indicator, so the source line qualifies the id. */
  id: string;
  name: string;
  datetime: string | null;
  values: Record<string, string>;
};

// A merged indicator line (AC-I4): one entry per line code, its cells combined
// across the program's indicators, its customer rows repeated per source.
export type IndicatorEntry = {
  code: string;
  name: string;
  lineNumber: number;
  isActive: boolean;
  cells: IndicatorCell[];
  customerRows: IndicatorCustomerRow[];
};

// The generic "Value" / "Comment" column names resolve by key; every other
// column name renders verbatim (spec S3 → Indicators tab cell editor).
const cellLabel = (columnName: string): string =>
  columnName === 'Value'
    ? t('label.value')
    : columnName === 'Comment'
      ? t('label.comment')
      : columnName;

// The cell's EFFECTIVE type drives the input (rules › indicator values): the
// column's configured type, falling back to the LINE's when the column has
// none. Only a Number cell is validated numerically by the server, so anything
// else — String, or typed nowhere — takes the text input that mirrors what the
// update accepts.
//
// The line leg is a fallback for servers whose `IndicatorColumnNode.valueType`
// still reports the column's RAW type; a current server resolves the fallback
// itself and sends the effective type (contract › indicator values). Older
// servers never send null at all (they answer a null type with the enum
// default, NUMBER — which is what left a `var` column on a text line wearing a
// number input the update would have taken text into).
const effectiveType = (
  column: 'NUMBER' | 'STRING' | null,
  line: 'NUMBER' | 'STRING' | null
): 'NUMBER' | 'STRING' => ((column ?? line) === 'NUMBER' ? 'NUMBER' : 'STRING');

// Merge the program's indicator lines into one entry per line code (AC-I4):
// indicators ordered alphabetically by code (so the first's columns lead),
// lines grouped by code, columns combined; a cell with no stored value is
// dropped, and a line with no stored cell is absent. Entries order by line
// number.
export const mergeIndicatorLines = (
  nodes: readonly IndicatorNode[]
): IndicatorEntry[] => {
  const ordered = [...nodes].sort((a, b) =>
    (a.code ?? '').localeCompare(b.code ?? '')
  );
  const byCode = new Map<string, LineAndColumns[]>();
  for (const indicator of ordered)
    for (const lc of indicator.lineAndColumns) {
      const group = byCode.get(lc.line.code);
      if (group) group.push(lc);
      else byCode.set(lc.line.code, [lc]);
    }

  const entries: IndicatorEntry[] = [];
  for (const [code, sources] of byCode) {
    const cells: IndicatorCell[] = [];
    const customerRows: IndicatorCustomerRow[] = [];
    for (const lc of sources) {
      for (const column of [...lc.columns].sort(
        (a, b) => a.columnNumber - b.columnNumber
      )) {
        if (!column.value) continue; // a column with no stored cell is absent
        cells.push({
          valueId: column.value.id,
          columnId: column.id,
          label: cellLabel(column.name),
          type: effectiveType(column.valueType, lc.line.valueType),
          value: column.value.value,
        });
      }
      for (const info of lc.customerIndicatorInfo)
        customerRows.push({
          id: `${lc.line.id}:${info.id}`,
          name: info.customer.name,
          datetime: info.datetime,
          values: Object.fromEntries(
            info.indicatorInformation.map(i => [i.columnId, i.value])
          ),
        });
    }
    if (cells.length === 0) continue; // a line with no stored cell is absent
    const first = sources[0].line;
    entries.push({
      code,
      name: first.name,
      lineNumber: first.lineNumber,
      isActive: sources.every(source => source.line.isActive),
      cells,
      customerRows,
    });
  }
  return entries.sort((a, b) => a.lineNumber - b.lineNumber);
};

// Write a saved cell back into the fetched nodes — the tab's source of truth.
// Without it the next mount of that cell's input (stepping to another line and
// back, leaving and re-entering the tab) re-reads the figure the screen loaded
// with and shows the pre-edit value until a reload (#957). Only the branch
// carrying the saved value is rebuilt; every other node, line, and column keeps
// its identity.
export const applySavedIndicatorValue = (
  nodes: readonly IndicatorNode[],
  valueId: string,
  value: string
): IndicatorNode[] =>
  nodes.map(node => ({
    ...node,
    lineAndColumns: node.lineAndColumns.map(lc =>
      lc.columns.some(column => column.value?.id === valueId)
        ? {
            ...lc,
            columns: lc.columns.map(column =>
              column.value?.id === valueId
                ? { ...column, value: { ...column.value, value } }
                : column
            ),
          }
        : lc
    ),
  }));

// The per-cell save (AC-I5): updateIndicatorValue, mapping the typed errors —
// RecordNotFound → messages.record-not-found, anything else →
// error.value-type-not-correct (the client's mapping, contract › edit). A save
// answers with the stored value, which the caller writes back into the nodes.
export type CellSaveResult =
  | { kind: 'saved'; value: string }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const saveIndicatorValue = async (
  storeId: string,
  id: string,
  value: string
): Promise<CellSaveResult> => {
  const result = await graphqlFetch(UpdateIndicatorValue, {
    storeId,
    input: { id, value },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateIndicatorValue;
  if (response.__typename === 'IndicatorValueNode')
    return { kind: 'saved', value: response.value };
  return {
    kind: 'error',
    message:
      response.error.__typename === 'RecordNotFound'
        ? t('messages.record-not-found')
        : t('error.value-type-not-correct'),
  };
};
