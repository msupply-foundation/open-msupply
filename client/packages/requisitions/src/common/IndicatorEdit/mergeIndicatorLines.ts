import {
  IndicatorColumnFragment,
  IndicatorLineWithColumnsFragment,
  ProgramIndicatorFragment,
} from '../../RequestRequisition/api';

// A merged column remembers whether the line it came from is active, so an
// inactive source line freezes only its own cells, not the whole merged entry.
export type MergedIndicatorColumn = IndicatorColumnFragment & {
  isLineActive: boolean;
};
export type MergedIndicatorLine = Omit<
  IndicatorLineWithColumnsFragment,
  'columns'
> & { columns: MergedIndicatorColumn[] };

// Sort by code so the merge order is deterministic across runs. Indicators
// without a code fall to the end — ￿ sorts after any normal codepoint.
const NULL_CODE = '￿';
const sortByCode = (
  indicators: ProgramIndicatorFragment[]
): ProgramIndicatorFragment[] =>
  [...indicators].sort((a, b) =>
    (a.code ?? NULL_CODE).localeCompare(b.code ?? NULL_CODE)
  );

// When a program configures multiple indicators against the same lines (e.g.
// HIV + REGIMEN), the same logical line (same `line.code`) appears once per
// indicator. Group them so the sidebar shows a single entry per code and the
// editor renders columns from both indicators together. Columns within each
// indicator are kept in columnNumber order so the two groups don't interleave.
//
// Only lines with at least one stored value for the period take part: an
// inactive line that shares its code with an active one has no values on a new
// requisition, and must not lend the merged entry its id or inactive status.
// Where several populated lines share a code, an active one is the entry's line.
export const mergeIndicatorLines = (
  indicators: ProgramIndicatorFragment[]
): MergedIndicatorLine[] => {
  const byCode = new Map<string, MergedIndicatorLine>();

  for (const indicator of sortByCode(indicators)) {
    for (const entry of indicator.lineAndColumns) {
      if (!entry.columns.some(c => c.value)) continue;

      const sortedColumns = [...entry.columns]
        .sort((a, b) => a.columnNumber - b.columnNumber)
        .map(c => ({ ...c, isLineActive: entry.line.isActive }));
      const key = entry.line.code || entry.line.id;
      const existing = byCode.get(key);
      if (!existing) {
        byCode.set(key, { ...entry, columns: sortedColumns });
        continue;
      }
      byCode.set(key, {
        ...existing,
        line:
          !existing.line.isActive && entry.line.isActive
            ? entry.line
            : existing.line,
        columns: [...existing.columns, ...sortedColumns],
        customerIndicatorInfo: [
          ...existing.customerIndicatorInfo,
          ...entry.customerIndicatorInfo,
        ],
      });
    }
  }

  return Array.from(byCode.values());
};
