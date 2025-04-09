/* eslint-disable react/jsx-key */
import React, { useEffect, useMemo, useState } from 'react';

import { Box, Typography } from '@mui/material';
import {
  BasicSpinner,
  useIsExtraSmallScreen,
  useRegisterActions,
} from '@openmsupply-client/common';

import { TableProps } from './types';
import { RecordWithId } from '@common/types';
import { useTranslation } from '@common/intl';
import { useTableStore } from './context';
import { useColumnDisplayState } from './hooks';
import { MobileTableView } from './components/MobileTableView';
import { DesktopTableView } from './components/DesktopTableView';

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
  width = '100%',
}: TableProps<T>): JSX.Element => {
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const [clickFocusedRow, setClickFocusedRow] = useState(false);
  const { setRows, setDisabledRows, setFocus } = useTableStore();
  const { columnDisplayState } = useColumnDisplayState(id, columns);

  const columnsToDisplay = useMemo(() => {
    const cols = columns.filter(c => columnDisplayState[String(c.key)] ?? true);

    return cols.every(c => c.key === 'selection') ? [] : cols;
  }, [columns, columnDisplayState]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (isDisabled) setDisabledRows(data.map(({ id }) => id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled, data]);

  // guard against a page number being set which is greater than the data allows
  useEffect(() => {
    if (!pagination || !onChangePage || !pagination.total) return;
    const { page, first, total } = pagination;
    if (page * first > total) onChangePage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination]);

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

  if (isExtraSmallScreen) {
    return (
      <MobileTableView
        data={data}
        columns={columns}
        columnsToDisplay={columnsToDisplay}
        onRowClick={onRowClick}
        generateRowTooltip={generateRowTooltip}
        isRowAnimated={isRowAnimated}
        additionalRows={additionalRows}
        pagination={pagination}
        onChangePage={onChangePage}
        width={width}
      />
    );
  }

  return (
    <DesktopTableView
      id={id}
      data={data}
      columns={columns}
      ExpandContent={ExpandContent}
      onRowClick={onRowClick}
      clickFocusedRow={clickFocusedRow}
      isRowAnimated={isRowAnimated}
      generateRowTooltip={generateRowTooltip}
      additionalRows={additionalRows}
      pagination={pagination}
      onChangePage={onChangePage}
      width={width}
      overflowX={overflowX}
      dense={dense}
      enableColumnSelection={enableColumnSelection}
    />
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
