import React from 'react';
import { Box, Stack, useMediaQuery } from '@mui/material';
import {
  MRT_Row,
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
} from 'material-react-table';
import { CardListItem } from './CardListItem';
import { IconButton } from '@common/components';
import { useTranslation } from '@common/intl';
import { RefreshIcon } from '@common/icons';
import { clearSavedState } from '../../tableState/utils';

interface CardListProps<T extends MRT_RowData> {
  table: MRT_TableInstance<T>;
  tableId: string;
  lastItemRef?: React.RefObject<HTMLDivElement>;
  groupIcons?: Record<string, React.ReactNode>;
  actions?: React.ReactNode;
  stickyTopOffset?: number;
}

const getRowOnClick = <T extends MRT_RowData>(
  table: MRT_TableInstance<T>,
  row: MRT_Row<T>
): React.MouseEventHandler<HTMLDivElement> | undefined => {
  const muiRowProps = table.options.muiTableBodyRowProps;
  const rowProps =
    typeof muiRowProps === 'function'
      ? muiRowProps({ row, table, staticRowIndex: 0 })
      : (muiRowProps ?? {});

  // TableRowProps.onClick is typed for HTMLTableRowElement, but we're
  // applying it to a Card (HTMLDivElement). The handler signatures are
  // compatible at runtime, so we need this cast to bridge the element types.
  return rowProps.onClick as
    | React.MouseEventHandler<HTMLDivElement>
    | undefined;
};

export const CardList = <T extends MRT_RowData>({
  table,
  tableId,
  lastItemRef,
  groupIcons,
  actions,
  stickyTopOffset = 0,
}: CardListProps<T>) => {
  const t = useTranslation();
  const rows = table.getRowModel().rows;
  const isLandscape = useMediaQuery(
    '(orientation: landscape) and (max-height: 800px)'
  );

  // Full reset to match the table view's resetTableState behaviour.
  // Card view only uses visibility and order, but we reset all properties
  // because the saved state is shared with the table view and to account for future expansion
  const resetToDefaults = () => {
    clearSavedState(tableId);
    const initial = table.options.initialState;
    table.setColumnVisibility(initial?.columnVisibility ?? {});
    table.resetColumnOrder();
    table.resetColumnSizing();
    table.resetColumnPinning();
    table.setDensity(initial?.density ?? 'comfortable');
  };

  return (
    <Stack
      spacing={isLandscape ? 1 : 1.5}
      sx={{
        width: '100%',
        ...(groupIcons ? {} : { mx: 'auto', maxWidth: 400 }),
      }}
    >
      <Box
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        gap={1}
        sx={{
          position: 'sticky',
          top: stickyTopOffset,
          zIndex: 2,
          backgroundColor: 'background.paper',
        }}
      >
        <MRT_ShowHideColumnsButton table={table} />
        <IconButton
          icon={<RefreshIcon fontSize="small" />}
          onClick={resetToDefaults}
          label={t('label.reset-table-defaults')}
        />
        {actions}
      </Box>
      {rows.map((row, index) => (
        <CardListItem
          key={row.id}
          row={row}
          cardRef={index === rows.length - 1 ? lastItemRef : undefined}
          groupIcons={groupIcons}
          onClick={getRowOnClick(table, row)}
        />
      ))}
    </Stack>
  );
};
