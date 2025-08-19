import { useMemo } from 'react';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import {
  ColumnDescription,
  DateInputCell,
  DateUtils,
  Formatter,
  NumberInputCell,
  PurchaseOrderNodeStatus,
  useColumns,
} from '@openmsupply-client/common/src';
import { calculatePricesAndDiscount, calculateUnitQuantities } from './utils';

export const usePurchaseOrderLineEditColumns = ({
  draft,
  updatePatch,
  status,
}: {
  draft?: DraftPurchaseOrderLine | null;
  updatePatch: (row: Partial<DraftPurchaseOrderLine>) => void;
  status: PurchaseOrderNodeStatus;
}) => {
  const columnDefinitions: ColumnDescription<DraftPurchaseOrderLine>[] =
    useMemo(
      () => [
        {
          Cell: NumberInputCell,
          key: 'numberOfPacks',
          label: 'label.requested-packs',
          setter: row => {
            // Adjust the requested and adjusted number of units based on the number of packs
            const adjustedPatch = calculateUnitQuantities(
              status,
              row,
            );
            updatePatch({ ...row, ...adjustedPatch });
          },
        },
        {
          Cell: NumberInputCell,
          key: 'requestedPackSize',
          label: 'label.pack-size',
          setter: row => {
            // Adjust the requested and adjusted number of units based on the new pack size
            const adjustedPatch = calculateUnitQuantities(
              status,
              row,
            );
            updatePatch({ ...row, ...adjustedPatch });
          },
        },
        ...(status === PurchaseOrderNodeStatus.Confirmed
          ? [
              {
                Cell: NumberInputCell,
                key: 'adjustedNumberOfUnits',
                label: 'label.adjusted-quantity',
                cellProps: {
                  isDisabled: true, // Edited via number of packs for now
                },
              },
            ]
          : []),
        {
          Cell: NumberInputCell,
          key: 'requestedNumberOfUnits',
          label: 'label.requested-quantity',
          cellProps: {
            isDisabled: true, // Edited via number of packs for now
          },
        },

        {
          Cell: NumberInputCell,
          key: 'pricePerUnitBeforeDiscount',
          label: 'label.price-per-unit-before-discount',
          setter: row => {
            const adjustedPatch = calculatePricesAndDiscount(
              'pricePerUnitBeforeDiscount',
              row
            );
            updatePatch({ ...row, ...adjustedPatch });
          },
          cellProps: {
            decimalLimit: 2,
          },
        },
        {
          Cell: NumberInputCell,
          key: 'discountPercentage',
          label: 'label.discount-percentage',

          setter: row => {
            const adjustedPatch = calculatePricesAndDiscount(
              'discountPercentage',
              row
            );
            updatePatch({ ...row, ...adjustedPatch });
          },
          cellProps: {
            decimalLimit: 2,
          },
        },
        {
          Cell: NumberInputCell,
          key: 'pricePerUnitAfterDiscount',
          label: 'label.price-per-unit-after-discount',
          setter: row => {
            const adjustedPatch = calculatePricesAndDiscount(
              'pricePerUnitAfterDiscount',
              row
            );
            updatePatch({ ...row, ...adjustedPatch });
          },
          cellProps: {
            decimalLimit: 2,
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
