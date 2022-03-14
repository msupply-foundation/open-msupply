import React, { useEffect, useState } from 'react';
import {
  Divider,
  isAlmostExpired,
  Box,
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  useCurrencyFormat,
  DataTable,
  useColumns,
  NonNegativeNumberInput,
  NonNegativeNumberInputCell,
  ColumnAlign,
  useTableStore,
  useTranslation,
  Typography,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../types';
import { PackSizeController } from './hooks';
import { sortByExpiry } from './utils';
import { useIsOutboundDisabled, useOutboundFields } from '../../api';

export interface OutboundLineEditTableProps {
  onChange: (key: string, value: number, packSize: number) => void;
  packSizeController: PackSizeController;
  rows: DraftOutboundLine[];
}

export const OutboundLineEditTable: React.FC<OutboundLineEditTableProps> = ({
  onChange,
  packSizeController,
  rows,
}) => {
  const { setDisabledRows } = useTableStore();

  const t = useTranslation('distribution');
  const { status } = useOutboundFields('status');
  const isDisabled = useIsOutboundDisabled();

  const placeholderRow = rows.find(
    ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
  );

  const updateDraftLine = (
    patch: Partial<DraftOutboundLine> & { id: string }
  ) => {
    const newValue = Math.min(
      patch.numberOfPacks ?? 0,
      patch.stockLine?.availableNumberOfPacks ?? 0
    );
    onChange?.(patch.id, newValue, patch.packSize ?? 1);
  };
  const rowsWithoutPlaceholder = rows
    .filter(({ type }) => type !== InvoiceLineNodeType.UnallocatedStock)
    .sort(sortByExpiry);

  const isRequestedPackSize = (packSize: number) =>
    packSizeController.selected?.value === -1 ||
    packSize === packSizeController.selected?.value;

  const columns = useColumns<DraftOutboundLine>(
    [
      [
        'numberOfPacks',
        {
          Cell: NonNegativeNumberInputCell,
          width: 100,
          label: 'label.num-packs',
          setter: updateDraftLine,
        },
      ],
      ['packSize'],
      [
        'unitQuantity',
        { accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize },
      ],
      {
        label: 'label.available',
        key: 'availableNumberOfPacks',
        align: ColumnAlign.Right,
        width: 85,
        accessor: ({ rowData }) =>
          rowData.stockLine?.availableNumberOfPacks ?? 0,
      },
      {
        label: 'label.in-store',
        key: 'totalNumberOfPacks',
        align: ColumnAlign.Right,
        width: 80,
        accessor: ({ rowData }) => rowData.stockLine?.totalNumberOfPacks ?? 0,
      },
      'batch',
      [
        'expiryDate',
        {
          styler: rowData => ({
            color:
              rowData.expiryDate &&
              isAlmostExpired(new Date(rowData.expiryDate))
                ? '#e63535'
                : 'inherit',
          }),
          width: 75,
        },
      ],
      [
        'locationName',
        {
          accessor: ({ rowData }) => rowData.location?.name,
          width: 70,
        },
      ],
      [
        'sellPricePerPack',
        {
          formatter: sellPrice => useCurrencyFormat(Number(sellPrice)),
          width: 75,
        },
      ],
      {
        label: 'label.on-hold',
        key: 'onHold',
        accessor: ({ rowData }) => rowData.stockLine?.onHold ?? false,
        formatter: onHold => (!!onHold ? '✓' : ''),
        width: 80,
      },
    ],
    {},
    [updateDraftLine]
  );

  const [batchRows, setBatchRows] = useState<DraftOutboundLine[]>([]);

  useEffect(() => {
    const allocatableRows: DraftOutboundLine[] = [];
    const onHoldRows: DraftOutboundLine[] = [];
    const noStockRows: DraftOutboundLine[] = [];
    const wrongPackSizeRows: DraftOutboundLine[] = [];

    rowsWithoutPlaceholder.forEach(row => {
      if (!!row.stockLine?.onHold) {
        onHoldRows.push(row);
        return;
      }

      if (row.stockLine?.availableNumberOfPacks === 0) {
        noStockRows.push(row);
        return;
      }

      if (!isRequestedPackSize(row.packSize)) {
        wrongPackSizeRows.push(row);
        return;
      }

      allocatableRows.push(row);
    });

    const disabledRows = wrongPackSizeRows
      .concat(onHoldRows)
      .concat(noStockRows);

    setDisabledRows(disabledRows.map(({ id }) => id));
    setBatchRows(allocatableRows.concat(disabledRows));
  }, [rows, packSizeController.selected?.value]);

  // <TableContainer sx={{ height: 375, overflowX: 'hidden' }}>
  // <Table style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>

  return (
    <Box height={400}>
      <Divider margin={10} />
      <DataTable
        isDisabled={isDisabled}
        columns={columns}
        data={batchRows}
        noDataMessage="Add a new line"
        dense
      />
      {placeholderRow ? (
        <Box display="flex">
          <Typography
            style={{
              alignItems: 'center',
              display: 'flex',
              flex: '0 1 100px',
              fontSize: 12,
              justifyContent: 'flex-end',
              paddingRight: 8,
            }}
          >
            {t('label.placeholder')}
          </Typography>
          <Box sx={{ paddingTop: '3px' }}>
            <NonNegativeNumberInput
              onChange={value => {
                onChange(placeholderRow.id, value, 1);
              }}
              value={placeholderRow.numberOfPacks}
              disabled={status !== InvoiceNodeStatus.New}
            />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};
