import { useMemo } from 'react';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import {
  ColumnDescription,
  DateInputCell,
  DateUtils,
  Formatter,
  NumberInputCell,
  useColumns,
} from '@openmsupply-client/common/src';

export const usePurchaseOrderLineEditColumns = ({
  draft,
  updatePatch,
}: {
  draft?: DraftPurchaseOrderLine | null;
  updatePatch: (patch: Partial<DraftPurchaseOrderLine>) => void;
}) => {
  const columnDefinitions: ColumnDescription<DraftPurchaseOrderLine>[] =
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

  const columns = useColumns<DraftPurchaseOrderLine>(columnDefinitions, {}, [
    updatePatch,
    draft,
  ]);

  return columns;
};
