import {
  IndicatorLineWithColumnsFragment,
  ProgramIndicatorFragment,
} from '../../RequestRequisition/api';

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
export const mergeIndicatorLines = (
  indicators: ProgramIndicatorFragment[]
): IndicatorLineWithColumnsFragment[] => {
  const byCode = new Map<string, IndicatorLineWithColumnsFragment>();

  for (const indicator of sortByCode(indicators)) {
    for (const entry of indicator.lineAndColumns) {
      const sortedColumns = [...entry.columns].sort(
        (a, b) => a.columnNumber - b.columnNumber
      );
      const key = entry.line.code || entry.line.id;
      const existing = byCode.get(key);
      if (!existing) {
        byCode.set(key, { ...entry, columns: sortedColumns });
        continue;
      }
      byCode.set(key, {
        ...existing,
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
