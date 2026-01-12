import React, { useMemo } from 'react';
import { DraftGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';
import { PatchDraftLineInput } from '../../api/hooks/useDraftGoodsReceivedLines';
import {
  Formatter,
  ColumnDef,
  useTranslation,
  ColumnType,
  ExpiryDateInput,
  IconButton,
  DeleteIcon,
  DateUtils,
  NumberInputCell,
  TextInputCell,
} from '@openmsupply-client/common';

interface GoodsReceivedLineEditColumnsProps {
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  removeDraftLine: (id: string) => void;
}

export const useGoodsReceivedLineEditColumns = ({
  updateDraftLine,
  removeDraftLine,
}: GoodsReceivedLineEditColumnsProps) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<DraftGoodsReceivedLine>[] => [
      {
        accessorKey: 'receivedPackSize',
        header: t('label.pack-size'),
        Cell: ({ cell, row: { original: row } }) => <NumberInputCell
          cell={cell}
          updateFn={value => updateDraftLine({ id: row.id, receivedPackSize: value })}
        />
      },
      {
        accessorKey: 'numberOfPacksReceived',
        header: t('label.number-of-packs-received'),
        Cell: ({ cell, row: { original: row } }) => <NumberInputCell
          cell={cell}
          updateFn={value => updateDraftLine({ id: row.id, numberOfPacksReceived: value })}
        />
      },
      {
        id: 'totalQuantity',
        accessorFn: row => (
          (row.receivedPackSize ?? 0) * (row.numberOfPacksReceived ?? 0)
        ),
        header: t('label.total-quantity'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        Cell: ({ cell, row: { original: row } }) => <TextInputCell
          cell={cell}
          updateFn={value => updateDraftLine({ id: row.id, batch: value })}
        />
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        Cell: ({ row: { original: row } }) => {
          return <ExpiryDateInput
            value={DateUtils.getDateOrNull(row.expiryDate)}
            onChange={newValue => {
              updateDraftLine({
                id: row.id,
                expiryDate: Formatter.naiveDate(newValue),
              })
            }}
          />
        },
      },
      // TODO: Convert manufacturerLinkId to use a dropdown of Manufacturer objects
      // {
      //   Cell: TextInputCell,
      //   key: 'manufacturerLinkId',
      //   label: 'label.manufacturer',
      //   accessor: ({ rowData }) => rowData.manufacturerLinkId,
      //   setter: updateDraftLine,
      // },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        Cell: ({ cell, row: { original: row } }) => <TextInputCell
          cell={cell}
          updateFn={value => updateDraftLine({ id: row.id, comment: value })}
        />
      },
      {
        id: 'delete',
        header: t('label.delete'),
        size: 50,
        Cell: ({ row: { original: row } }) => <IconButton
          label="Delete"
          onClick={() => removeDraftLine(row.id)}
          icon={<DeleteIcon fontSize="small" />}
        />,
      },
    ],
    [updateDraftLine]
  );

  return columns;
};
