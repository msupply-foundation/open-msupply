import { useMemo } from 'react';
import { DraftGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';
import {
  ColumnDescription,
  DateInputCell,
  DateUtils,
  Formatter,
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
          Cell: DateInputCell,
          key: 'requestedDeliveryDate',
          label: 'Requested delivery date',
          setter: ({ id, requestedDeliveryDate }) => {
            updatePatch({
              id,
              requestedDeliveryDate: Formatter.naiveDate(
                DateUtils.getNaiveDate(requestedDeliveryDate)
              ),
            });
          },
        },
        {
          Cell: DateInputCell,
          key: 'expectedDeliveryDate',
          label: 'Expected Delivery Date',
          setter: ({ id, expectedDeliveryDate }) => {
            updatePatch({
              id,
              expectedDeliveryDate: Formatter.naiveDate(
                DateUtils.getNaiveDate(expectedDeliveryDate)
              ),
            });
          },
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
