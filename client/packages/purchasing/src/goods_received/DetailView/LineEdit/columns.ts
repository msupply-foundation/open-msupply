import { useMemo } from 'react';
import { DraftGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';
import {
  ColumnDescription,
  DateInputCell,
  NumberInputCell,
  useColumns,
} from '@openmsupply-client/common/src';

export const useGoodsReceivedLineEditColumns = ({
  draft,
  updatePatch,
}: {
  draft?: DraftGoodsReceivedLine | null;
  updatePatch: (patch: Partial<DraftGoodsReceivedLine>) => void;
}) => {
  const columnDefinitions: ColumnDescription<DraftGoodsReceivedLine>[] =
    useMemo(
      () => [
        {
          Cell: NumberInputCell,
          key: 'requestedPackSize',
          label: 'label.pack-size',
          setter: patch => {
            updatePatch({ ...patch });
          },
        },
        {
          Cell: NumberInputCell,
          key: 'requestedNumberOfUnits',
          label: 'label.requested-quantity',
          setter: patch => {
            updatePatch({ ...patch });
          },
        },
        {
          key: 'totalQuantity',
          label: 'label.total-quantity',
          accessor: ({ rowData }) =>
            (rowData.receivedPackSize ?? 0) *
            (rowData.numberOfPacksReceived ?? 0),
        },
        {
          key: 'batch',
          label: 'label.batch',
          accessor: ({ rowData }) => rowData.batch,
        },
        {
          Cell: DateInputCell,
          key: 'expiryDate',
          label: 'label.expiry-date',
        },
        {
          key: 'manufacturer',
          label: 'label.manufacturer',
          accessor: ({ rowData }) => rowData.manufacturerLinkId,
        },
        {
          key: 'comment',
          label: 'label.comment',
          accessor: ({ rowData }) => rowData.comment,
        },
      ],
      [updatePatch]
    );

  const columns = useColumns<DraftGoodsReceivedLine>(columnDefinitions, {}, [
    updatePatch,
    draft,
  ]);

  return columns;
};
