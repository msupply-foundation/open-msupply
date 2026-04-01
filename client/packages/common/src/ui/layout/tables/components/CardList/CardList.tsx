import React from 'react';
import { Box, Stack } from '@mui/material';
import {
  MRT_Row,
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
} from 'material-react-table';
import { CardListItem } from './CardListItem';
import { IconButton, useConfirmationModal } from '@common/components';
import { useTranslation } from '@common/intl';
import { RefreshIcon } from '@common/icons';
import { clearSavedState } from '../../tableState/utils';
import { useIsLandscapeTablet } from '@common/hooks';

interface CardListProps<T extends MRT_RowData> {
  table: MRT_TableInstance<T>;
  tableId: string;
  lastItemRef?: React.RefObject<HTMLDivElement | null>;
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
  const isLandscape = useIsLandscapeTablet();

  // Full reset to match the table view's resetTableState behaviour.
  // Card view only uses visibility and order, but we reset all properties
  // because the saved state is shared with the table view and to account for future expansion.
  // Note: doesn't respect global custom table defaults (as set via resetTableState
  // in useBaseMaterialTable) — will need to be extended when there's UI for that here.
  const resetToDefaults = () => {
    clearSavedState(tableId);
    const initial = table.options.initialState;
    table.setColumnVisibility(initial?.columnVisibility ?? {});
    table.resetColumnOrder();
    table.resetColumnSizing();
    table.resetColumnPinning();
    table.setDensity(initial?.density ?? 'comfortable');
  };

  const getResetConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.reset-card-defaults'),
    onConfirm: resetToDefaults,
  });

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
          onClick={() => getResetConfirmation()}
          label={t('label.reset-table-defaults')}
        />
        {actions}
      </Box>
      {rows.length === 0
        ? table.options.renderEmptyRowsFallback?.({ table })
        : rows.map((row, index) => (
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
