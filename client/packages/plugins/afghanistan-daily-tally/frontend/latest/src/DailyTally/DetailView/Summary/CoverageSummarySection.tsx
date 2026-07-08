import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@openmsupply-client/common';
import { usePluginLabelTranslation, usePluginTranslation } from '../../../locales';
import { CoverageTableModel } from './summaryMath';
import { useDoseFormat } from '../useDoseFormat';

interface Props {
  model: CoverageTableModel;
}

// The Dose column is fixed (wide enough for the "… Subtotal" labels on one
// line); the data columns are left auto so table-layout:fixed shares the
// remaining width across them — they grow to fill the card (so a few-column
// table like Women's isn't comically narrow) but never dump slack into Dose.
// The minWidth floor keeps them readable and triggers horizontal scroll only
// when the card is genuinely too narrow.
const DOSE_COL_WIDTH = 150;
const COUNT_MIN_WIDTH = 60;
const TOTAL_MIN_WIDTH = 64;

// Coverage summary for a single SummaryTable from config — e.g. Children's
// or Women's. Two-row header (column-group label + sub-headers derived from
// counter labels), one body row per non-zero dose, plus a subtotal row.
export const CoverageSummarySection = ({ model }: Props) => {
  const t = usePluginTranslation();
  const tLabel = usePluginLabelTranslation();
  const { formatDoses } = useDoseFormat();
  const { table, columns, subColumns, rows, subtotalsByCell, subtotal } = model;

  // Flat list of (columnId, counterLabel) pairs in render order; used for
  // body cells + subtotal so the cell order matches the sub-header order.
  const flatCells: { columnId: string; counterLabel: string }[] = [];
  columns.forEach(col =>
    (subColumns[col.id] ?? []).forEach(label =>
      flatCells.push({ columnId: col.id, counterLabel: label })
    )
  );

  // Floor below which the table scrolls rather than squeezing the columns.
  const tableMinWidth =
    DOSE_COL_WIDTH + flatCells.length * COUNT_MIN_WIDTH + TOTAL_MIN_WIDTH;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
      }}
    >
      <Box
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          px: 2,
          py: 1.25,
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          color="primary.contrastText"
        >
          {tLabel(table.label)}
        </Typography>
      </Box>

      {/* Scrolls within the card if a wide config still overflows, so the table
          can never push the page wider than its container. */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table
          size="small"
          // Fixed layout fills the card (width:100%) sharing the space across
          // the auto data columns, while the Dose column stays at its set width
          // and minWidth keeps it readable (scrolling below that). Tight
          // horizontal padding since the columns are narrow.
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            minWidth: tableMinWidth,
            '& .MuiTableCell-root': { px: 1 },
          }}
        >
          <colgroup>
            {/* Only Dose has a fixed width; the data columns are auto so the
                table shares the remaining width across them. */}
            <col style={{ width: DOSE_COL_WIDTH }} />
            {flatCells.map(({ columnId, counterLabel }) => (
              <col key={`col:${columnId}:${counterLabel}`} />
            ))}
            <col />
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ fontWeight: 600 }}>
                {t('summary.coverage.dose')}
              </TableCell>
              {columns.map(col => (
                <TableCell
                  key={col.id}
                  colSpan={Math.max(1, (subColumns[col.id] ?? []).length)}
                  align="center"
                  sx={{ fontWeight: 600, lineHeight: 1.2 }}
                >
                  {tLabel(col.label)}
                </TableCell>
              ))}
              <TableCell
                rowSpan={2}
                align="right"
                sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {t('summary.coverage.total')}
              </TableCell>
            </TableRow>
            <TableRow>
              {flatCells.map(({ columnId, counterLabel }) => (
                <TableCell
                  key={`${columnId}:${counterLabel}`}
                  align="right"
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    lineHeight: 1.2,
                    verticalAlign: 'bottom',
                  }}
                >
                  {tLabel(counterLabel)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={1 + flatCells.length + 1}>
                  <Typography variant="body2" color="text.secondary">
                    {t('summary.coverage.empty')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow key={row.doseId}>
                  <TableCell sx={{ color: 'primary.main' }}>
                    {row.doseLabel}
                  </TableCell>
                  {flatCells.map(({ columnId, counterLabel }) => {
                    const cell = row.cells.find(
                      c =>
                        c.columnId === columnId &&
                        c.counterLabel === counterLabel
                    );
                    return (
                      <TableCell
                        key={`${columnId}:${counterLabel}`}
                        align="right"
                      >
                        {formatDoses(cell?.count ?? 0)}
                      </TableCell>
                    );
                  })}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatDoses(row.total)}
                  </TableCell>
                </TableRow>
              ))
            )}

            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 700 }}>
                {table.subtotal_label}
              </TableCell>
              {flatCells.map(({ columnId, counterLabel }) => (
                <TableCell
                  key={`subtotal:${columnId}:${counterLabel}`}
                  align="right"
                  sx={{ fontWeight: 600 }}
                >
                  {formatDoses(
                    subtotalsByCell[`${columnId}:${counterLabel}`] ?? 0
                  )}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatDoses(subtotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};
