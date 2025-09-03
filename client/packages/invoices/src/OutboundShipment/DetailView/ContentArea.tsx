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
  useFeatureFlags,
  usePreferences,
} from '@openmsupply-client/common';
import {
  MaterialReactTable,
  MRT_ColumnDef as MRTColumnDef,
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
  const { tableUsabilityImprovements } = useFeatureFlags();
  const { manageVvmStatusForStock } = usePreferences();

  const mrtColumns = useMemo<
    MRTColumnDef<StockOutLineFragment | StockOutItem>[]
  >(() => {
    const cols = [
      // TO-DO: Note popover column,
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 120,
      },
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        // size: 140,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 130,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 160,
      },
    ];

    if (manageVvmStatusForStock)
      cols.push({
        accessorKey: 'vvmStatus.description',
        header: t('label.vvm-status'),
      });

    cols.push(
      {
        accessorKey: 'location.code',
        header: t('label.location'),
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
      }
    );

    // if (manageVaccinesInDoses) {
    //   columns.push(getDosesPerUnitColumn(t));
    // }

    return cols;
  }, [manageVvmStatusForStock]);

  const table = useMaterialReactTable({
    columns: mrtColumns,
    data: rows ?? [],
    enablePagination: false,
    enableRowVirtualization: true,
    // muiTableBodyProps: {
    //   sx: { border: '1px solid blue', width: '100%' },
    // },
    enableColumnResizing: true,
    enableRowSelection: true,
    initialState: {
      density: 'compact',
    },
    muiTableHeadCellProps: {
      sx: {
        fontSize: '14px',
        lineHeight: 1.2,
        verticalAlign: 'bottom',
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: '14px',
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
      },
    },
    muiTableBodyRowProps: ({ row, staticRowIndex }) => ({
      onClick: () => {
        if (onRowClick) onRowClick(row.original);
      },
      sx: {
        backgroundColor: staticRowIndex % 2 === 0 ? 'transparent' : '#fafafb', // light grey on odd rows
        '& td': {
          borderBottom: '1px solid rgba(224, 224, 224, 1)',
        },
      },
    }),
  });

  if (!rows) return null;

  return tableUsabilityImprovements ? (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <MaterialReactTable table={table} />
    </div>
  ) : (
    <DataTable
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
    />
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
