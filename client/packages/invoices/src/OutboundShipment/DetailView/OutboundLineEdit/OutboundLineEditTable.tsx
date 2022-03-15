import React, { useEffect, useState } from 'react';
import {
  Divider,
  Box,
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  DataTable,
  NonNegativeNumberInput,
  useTableStore,
  useTranslation,
  Typography,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../types';
import { PackSizeController } from './hooks';
import { sortByExpiry } from './utils';
import { useIsOutboundDisabled, useOutboundFields } from '../../api';
import { useOutboundLineEditColumns } from './columns';

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
  const columns = useOutboundLineEditColumns({ onChange });

  const placeholderRow = rows.find(
    ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
  );

  const rowsWithoutPlaceholder = rows
    .filter(({ type }) => type !== InvoiceLineNodeType.UnallocatedStock)
    .sort(sortByExpiry);

  const isRequestedPackSize = (packSize: number) =>
    packSizeController.selected?.value === -1 ||
    packSize === packSizeController.selected?.value;

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

  return (
    <Box>
      {' '}
      <Divider margin={10} />
      <Box style={{ height: 390, overflowX: 'hidden', overflowY: 'scroll' }}>
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
    </Box>
  );
};
