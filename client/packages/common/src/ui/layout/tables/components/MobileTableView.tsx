import React, { ReactElement, useRef } from 'react';
import { PaginationRow } from '../columns/PaginationRow';
import { RecordWithId } from '@common/types';
import {
  Box,
  Column,
  Pagination,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { DataCard } from './DataCard';

interface MobileTableViewProps<T extends RecordWithId> {
  data: T[];
  width?: string | number;
  isRowAnimated?: boolean;
  columns: Column<T>[];
  columnsToDisplay?: Column<T>[];
  additionalRows?: JSX.Element[];
  onChangePage?: (page: number) => void;
  onRowClick?: ((row: T) => void) | null;
  generateRowTooltip?: (row: T) => string;
  pagination?: (Pagination & { total?: number }) | undefined;
}

export function MobileTableView<T extends RecordWithId>({
  data,
  columns,
  columnsToDisplay,
  width = '100%',
  onRowClick,
  isRowAnimated = false,
  pagination,
  additionalRows,
  onChangePage,
  generateRowTooltip,
}: MobileTableViewProps<T>): ReactElement {
  const t = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { localisedDate } = useFormatDateTime();

  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
        width,
      }}
    >
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
        <>
          {data.map((row, index) => (
            <DataCard
              key={row.id}
              rowIndex={index}
              columns={columnsToDisplay ?? columns}
              onClick={onRowClick ? onRowClick : undefined}
              rowData={row}
              rowKey={String(index)}
              generateRowTooltip={generateRowTooltip}
              localisedText={t}
              localisedDate={localisedDate}
              isAnimated={isRowAnimated}
            />
          ))}
          {additionalRows}
        </>
      </Box>
      {pagination && onChangePage && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            backgroundColor: 'background.paper',
            padding: 1,
            zIndex: 100,
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.05)',
          }}
        >
          <PaginationRow
            page={pagination.page}
            offset={pagination.offset}
            first={pagination.first}
            total={pagination.total ?? 0}
            onChange={onChangePage}
          />
        </Box>
      )}
    </Box>
  );
}
