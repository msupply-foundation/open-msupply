import React, { useMemo } from 'react';
import { DraftGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';
import { PatchDraftLineInput } from '../../api/hooks/useDraftGoodsReceivedLines';
import {
  ColumnDescription,
  DateInputCell,
  NumberInputCell,
  TextInputCell,
  useColumns,
  DeleteIcon,
  IconButton,
} from '@openmsupply-client/common';

interface GoodsReceivedLineEditColumnsProps {
  draft?: DraftGoodsReceivedLine | null;
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  removeDraftLine: (id: string) => void;
}

export const useGoodsReceivedLineEditColumns = ({
  draft,
  updateDraftLine,
  removeDraftLine,
}: GoodsReceivedLineEditColumnsProps) => {
  const columnDefinitions: ColumnDescription<DraftGoodsReceivedLine>[] =
    useMemo(
      () => [
        {
          Cell: NumberInputCell,
          key: 'requestedPackSize',
          label: 'label.pack-size',
          setter: updateDraftLine,
          accessor: ({ rowData }) => rowData.receivedPackSize,
        },
        {
          Cell: NumberInputCell,
          key: 'requestedNumberOfUnits',
          label: 'label.requested-quantity',
          setter: updateDraftLine,
          accessor: ({ rowData }) => rowData.numberOfPacksReceived,
        },
        {
          key: 'totalQuantity',
          label: 'label.total-quantity',
          accessor: ({ rowData }) =>
            (rowData.receivedPackSize ?? 0) *
            (rowData.numberOfPacksReceived ?? 0),
        },
        {
          Cell: TextInputCell,
          key: 'batch',
          label: 'label.batch',
          accessor: ({ rowData }) => rowData.batch,
          setter: updateDraftLine,
        },
        {
          Cell: DateInputCell,
          key: 'expiryDate',
          label: 'label.expiry-date',
          accessor: ({ rowData }) => rowData.expiryDate,
          setter: updateDraftLine,
        },
        {
          Cell: TextInputCell,
          key: 'manufacturer',
          label: 'label.manufacturer',
          accessor: ({ rowData }) => rowData.manufacturerLinkId,
          setter: updateDraftLine,
        },
        {
          Cell: TextInputCell,
          key: 'comment',
          label: 'label.comment',
          accessor: ({ rowData }) => rowData.comment,
          setter: updateDraftLine,
        },
        {
          key: 'delete',
          width: 50,
          Cell: ({ rowData }) => (
            <IconButton
              label="Delete"
              onClick={() => removeDraftLine(rowData.id)}
              icon={<DeleteIcon fontSize="small" />}
            />
          ),
        },
      ],
      [updateDraftLine, removeDraftLine]
    );

  const columns = useColumns<DraftGoodsReceivedLine>(columnDefinitions, {}, [
    updateDraftLine,
    draft,
  ]);

  return columns;
};
