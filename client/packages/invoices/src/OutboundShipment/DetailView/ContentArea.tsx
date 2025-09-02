import React, { FC, useEffect, useMemo } from 'react';
import {
  DataTable,
  useTranslation,
  useIsGrouped,
  InvoiceLineNodeType,
  useRowStyle,
  AppSxProp,
  NothingHere,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import {
  MaterialReactTable,
  MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { useOutbound } from '../api';
import { useOutboundColumns } from './columns';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';
import { Expand } from './ExpandoTable';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: StockOutLineFragment | StockOutItem) => void);
}

const useHighlightPlaceholderRows = (
  rows: StockOutLineFragment[] | StockOutItem[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;
    const placeholders = [];

    // This is a verbose .filter() on `rows` to find the placeholder lines.
    // There is an issue with using `filter()` on a type which is
    // A[] | B[]
    // https://github.com/microsoft/TypeScript/issues/44373
    for (const row of rows) {
      if ('type' in row) {
        if (
          row.type === InvoiceLineNodeType.UnallocatedStock ||
          row.numberOfPacks === 0
        ) {
          placeholders.push(row.id);
        }
      } else {
        const hasPlaceholder = row.lines.some(
          line => line.type === InvoiceLineNodeType.UnallocatedStock
        );
        if (hasPlaceholder) {
          // Add both the OutboundItem and the individual lines, as
          // this will cause the item to be highlighted as well as the
          // lines within the expansion when grouped.
          row.lines.forEach(line => {
            if (line.type === InvoiceLineNodeType.UnallocatedStock) {
              placeholders.push(line.id);
            }
          });
          placeholders.push(row.id);
        }
      }
    }

    const style: AppSxProp = {
      color: theme => theme.palette.secondary.light,
    };
    setRowStyles(placeholders, style);
  }, [rows, setRowStyles]);
};

export const ContentAreaComponent: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation();

  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { isGrouped } = useIsGrouped('outboundShipment');
  const { rows } = useOutbound.line.rows(isGrouped);
  const columns = useOutboundColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  const isDisabled = useOutbound.utils.isDisabled();
  useHighlightPlaceholderRows(rows);

  if (!rows) return null;

  console.log('rows', rows);

  const mrtColumns = useMemo<
    MRT_ColumnDef<StockOutLineFragment | StockOutItem>[]
  >(
    () => [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        // size: 140,
        enableColumnOrdering: false,
        enableEditing: false,
        enableSorting: true,
        enableResizing: true,
        // muiTableHeadCellProps: { align: 'left' },
        // muiTableBodyCellProps: { align: 'left' },
        // isSticky: true,
      },
      {
        accessorKey: 'item.name',
        header: 'Item name',
        // size: 140,
        enableColumnOrdering: false,
        enableEditing: false,
        enableSorting: true,
        enableResizing: true,
        // muiTableHeadCellProps: { align: 'left' },
        // muiTableBodyCellProps: { align: 'left' },
        // isSticky: true,
      },
      {
        accessorKey: 'batch',
        header: 'Batch',
        // size: 140,
        enableColumnOrdering: false,
        enableEditing: false,
        enableSorting: true,
        enableResizing: true,
        // muiTableHeadCellProps: { align: 'left' },
        // muiTableBodyCellProps: { align: 'left' },
        // isSticky: true,
      },
      {
        accessorKey: 'expiryDate',
        header: 'Expiry Date',
        // size: 140,
        enableColumnOrdering: false,
        enableEditing: false,
        enableSorting: true,
        enableResizing: true,
        // muiTableHeadCellProps: { align: 'left' },
        // muiTableBodyCellProps: { align: 'left' },
        // isSticky: true,
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns: mrtColumns,
    data: rows,
    enablePagination: false,
    enableRowVirtualization: true,
    muiTableContainerProps: {
      sx: { maxHeight: '600px', width: '100%' },
    },
    // muiTableBodyProps: {
    //   sx: { border: '1px solid blue', width: '100%' },
    // },
    enableColumnResizing: true,
    // muiTableBodyRowProps: {
    //   sx: {
    //     borderBottom: '1px solid rgba(224, 224, 224, 1)',
    //   },
    // },
    // muiTableProps: {
    //   sx: {
    //     width: '100%',
    //     border: '1px solid green',
    //     // tableLayout: 'fixed', // ensures columns share extra space
    //   },
    // },
  });

  return (
    <>
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <MaterialReactTable table={table} />
        {/* <DataTable
        id="outbound-detail"
        onRowClick={onRowClick}
        ExpandContent={props => <Expand {...props} />}
        columns={columns}
        data={rows}
        enableColumnSelection
        noDataElement={
          <NothingHere
            body={t('error.no-outbound-items')}
            onCreate={isDisabled ? undefined : () => onAddItem()}
            buttonText={t('button.add-item')}
          />
        }
        isRowAnimated={true}
      /> */}
      </div>
    </>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
