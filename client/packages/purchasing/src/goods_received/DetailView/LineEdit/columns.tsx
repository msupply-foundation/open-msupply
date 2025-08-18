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
  Formatter,
  DateUtils,
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
          key: 'receivedPackSize',
          label: 'label.pack-size',
          setter: updateDraftLine,
          accessor: ({ rowData }) => rowData.receivedPackSize,
        },
        {
          Cell: NumberInputCell,
          key: 'numberOfPacksReceived',
          label: 'label.number-of-packs-received',
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
          setter: rowData => {
            const formattedDate = Formatter.naiveDate(
              DateUtils.getDateOrNull(rowData.expiryDate)
            );
            updateDraftLine({
              id: rowData.id,
              expiryDate: formattedDate,
            });
          },
        },
        {
          Cell: TextInputCell,
          key: 'manufacturerLinkId',
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
