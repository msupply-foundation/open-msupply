import React, { ReactElement, useMemo, useRef } from 'react';

import {
  Box,
  TableBody,
  TableHead,
  TableContainer,
  Table as MuiTable,
  TableCell,
} from '@mui/material';
import { RecordWithId } from '@common/types';
import { TableProps } from '../types';
import { ColumnPicker, HeaderCell, HeaderRow } from './Header';
import { useColumnDisplayState } from '../hooks';
import { PaginationRow } from '../columns/PaginationRow';
import { ViewportList } from 'react-viewport-list';
import { DataRow } from './DataRow';
import { useFormatDateTime, useTranslation } from '@common/intl';

export const DesktopTableView = <T extends RecordWithId>({
  id,
  ExpandContent,
  columns,
  data = [],
  dense = false,
  enableColumnSelection,
  generateRowTooltip,
  isRowAnimated = false,
  overflowX = 'unset',
  pagination,
  onChangePage,
  onRowClick,
  additionalRows,
  width = '100%',
  clickFocusedRow,
}: TableProps<T> & { clickFocusedRow: boolean }) => {
  const t = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { localisedDate } = useFormatDateTime();

  const { columnDisplayState, showAllColumns, toggleColumn } =
    useColumnDisplayState(id, columns);

  const columnsToDisplay = useMemo(() => {
    const cols = columns.filter(c => columnDisplayState[String(c.key)] ?? true);

    return cols.every(c => c.key === 'selection') ? [] : cols;
  }, [columns, columnDisplayState]);

  const RenderRows = (): ReactElement => {
    if (ExpandContent != undefined)
      return (
        <>
          {data.map((row, idx) => (
            <DataRow
              key={row.id}
              ExpandContent={ExpandContent}
              rowIndex={idx}
              columns={columnsToDisplay}
              onClick={onRowClick ? onRowClick : undefined}
              rowData={row}
              rowKey={String(idx)}
              dense={dense}
              keyboardActivated={clickFocusedRow}
              generateRowTooltip={generateRowTooltip}
              localisedText={t}
              localisedDate={localisedDate}
              isAnimated={isRowAnimated}
            />
          ))}
          {additionalRows}
        </>
      );

    return (
      <>
        <ViewportList
          viewportRef={ref}
          items={data}
          axis="y"
          itemSize={40}
          renderSpacer={({ ref, style }) => <tr ref={ref} style={style} />}
          initialDelay={1}
        >
          {(row, idx) => (
            <DataRow
              key={row.id}
              ExpandContent={ExpandContent}
              rowIndex={idx}
              columns={columnsToDisplay}
              onClick={onRowClick ? onRowClick : undefined}
              rowData={row}
              rowKey={String(idx)}
              dense={dense}
              keyboardActivated={clickFocusedRow}
              generateRowTooltip={generateRowTooltip}
              localisedText={t}
              localisedDate={localisedDate}
              isAnimated={isRowAnimated}
            />
          )}
        </ViewportList>
        {additionalRows}
      </>
    );
  };

  return (
    <TableContainer
      ref={ref}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflowX,
        overflowY: 'auto',
        width,
      }}
    >
      <MuiTable style={{ borderCollapse: 'separate' }}>
        <TableHead
          sx={{
            backgroundColor: 'background.white',
            position: 'sticky',
            top: 0,
            zIndex: 'tableHeader',
            boxShadow: dense ? null : theme => theme.shadows[2],
          }}
        >
          <HeaderRow dense={dense}>
            {columnsToDisplay.map(column => (
              <HeaderCell
                dense={dense}
                column={column}
                key={String(column.key)}
              />
            ))}
            {!!enableColumnSelection && (
              <TableCell
                role="columnheader"
                padding={'none'}
                sx={{
                  backgroundColor: 'transparent',
                  borderBottom: '0px',
                  width: 30,
                }}
              >
                <ColumnPicker
                  columns={columns}
                  columnDisplayState={columnDisplayState}
                  toggleColumn={toggleColumn}
                  showAllColumns={showAllColumns}
                />
              </TableCell>
            )}
          </HeaderRow>
        </TableHead>
        <TableBody>
          <RenderRows />
        </TableBody>
      </MuiTable>
      <Box
        sx={{
          flex: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          left: 0,
          insetBlockEnd: 0,
          backgroundColor: 'white',
          justifyContent: 'flex-end',
          zIndex: 100,
        }}
      >
        {pagination && onChangePage && (
          <PaginationRow
            page={pagination.page}
            offset={pagination.offset}
            first={pagination.first}
            total={pagination.total ?? 0}
            onChange={onChangePage}
          />
        )}
      </Box>
    </TableContainer>
  );
};
