/* eslint-disable react/jsx-key */
import React, { useEffect, useRef, useState } from 'react';

import { ViewportList } from 'react-viewport-list';
import {
  Box,
  TableBody,
  TableHead,
  TableContainer,
  Table as MuiTable,
  Typography,
  TableCell,
} from '@mui/material';
import {
  BasicSpinner,
  Column,
  useRegisterActions,
} from '@openmsupply-client/common';

import { TableProps } from './types';
import { DataRow } from './components/DataRow/DataRow';
import { PaginationRow } from './columns/PaginationRow';
import { ColumnPicker, HeaderCell, HeaderRow } from './components/Header';
import { RecordWithId } from '@common/types';
import { useFormatDateTime, useTranslation } from '@common/intl';
import { useTableStore } from './context';
import { useColumnDisplayState } from './hooks';

interface RenderRowsProps<T extends RecordWithId> {
  mRef: React.RefObject<HTMLDivElement>;
  data: T[];
  ExpandContent?: React.FC<{ rowData: T }>;
  columnsToDisplay: Column<T>[];
  onRowClick?: ((row: T) => void) | null;
  dense: boolean;
  clickFocusedRow: boolean;
  generateRowTooltip: ((row: T) => string) | undefined;
  isRowAnimated: boolean;
  additionalRows?: JSX.Element[];
}
const RenderRows = <T extends RecordWithId>({
  mRef,
  data,
  ExpandContent,
  columnsToDisplay,
  onRowClick,
  dense,
  clickFocusedRow,
  generateRowTooltip,
  isRowAnimated,
  additionalRows,
}: RenderRowsProps<T>) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

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
        viewportRef={mRef}
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

const DataTableComponent = <T extends RecordWithId>({
  id,
  ExpandContent,
  columns,
  data = [],
  dense = false,
  enableColumnSelection,
  generateRowTooltip,
  isDisabled = false,
  isError = false,
  isLoading = false,
  isRowAnimated = false,
  noDataElement,
  noDataMessage,
  overflowX = 'unset',
  pagination,
  onChangePage,
  onRowClick,
  additionalRows,
}: TableProps<T>): JSX.Element => {
  const t = useTranslation();
  const { setRows, setDisabledRows, setFocus } = useTableStore();
  const [clickFocusedRow, setClickFocusedRow] = useState(false);
  const { columnDisplayState, toggleColumn } = useColumnDisplayState(
    id,
    columns
  );

  const columnsToDisplay = React.useMemo(
    () => columns.filter(c => columnDisplayState[String(c.key)] ?? true),
    [columns, columnDisplayState]
  );

  useRegisterActions([
    {
      id: 'table:focus-down',
      name: '', // No name => won't show in Modal menu
      shortcut: ['arrowdown'],
      keywords: 'focus, down',
      perform: () => setFocus('down'),
    },
    {
      id: 'table:focus-up',
      name: '',
      shortcut: ['arrowup'],
      keywords: 'focus, up',
      perform: () => setFocus('up'),
    },
    {
      id: 'table:press-enter',
      name: '',
      shortcut: ['enter'],
      keywords: 'table, enter',
      perform: () => {
        console.info('Press enter');
        setClickFocusedRow(true);
      },
    },
  ]);

  useEffect(() => {
    if (data.length) setRows(data.map(({ id }) => id));
  }, [data]);

  useEffect(() => {
    if (isDisabled) setDisabledRows(data.map(({ id }) => id));
  }, [isDisabled, data]);

  // guard against a page number being set which is greater than the data allows
  useEffect(() => {
    if (!pagination || !onChangePage || !pagination.total) return;
    const { page, first, total } = pagination;
    if (page * first > total) onChangePage(0);
  }, [pagination]);

  const ref = useRef<HTMLDivElement>(null);

  if (isLoading) return <BasicSpinner />;

  if (isError) {
    return (
      <Box sx={{ padding: 2 }}>
        <Typography sx={{ color: 'error.main' }}>
          {t('error.unable-to-load-data')}
        </Typography>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      noDataElement || (
        <Box sx={{ padding: 2 }}>
          <Typography sx={{ color: 'gray.dark' }}>
            {noDataMessage || t('error.no-results')}
          </Typography>
        </Box>
      )
    );
  }

  return (
    <TableContainer
      ref={ref}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflowX,
        overflowY: 'auto',
      }}
    >
      <MuiTable>
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
                />
              </TableCell>
            )}
          </HeaderRow>
        </TableHead>
        <TableBody>
          <RenderRows
            mRef={ref}
            data={data}
            ExpandContent={ExpandContent}
            columnsToDisplay={columnsToDisplay}
            onRowClick={onRowClick}
            dense={dense}
            clickFocusedRow={clickFocusedRow}
            generateRowTooltip={generateRowTooltip}
            isRowAnimated={isRowAnimated}
            additionalRows={additionalRows}
          />
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

// This is a hack!
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/37087
// Using generic types while using `react.memo` doesn't work well.
// There are a few alternatives for some situations. However they didn't
// work for this one!
export const DataTable = React.memo(
  DataTableComponent
) as typeof DataTableComponent;
