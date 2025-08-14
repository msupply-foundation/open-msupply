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
  updatePatch: (patch: Partial<DraftPurchaseOrderLine>) => void;
  status: PurchaseOrderNodeStatus;
}) => {
  const columnDefinitions: ColumnDescription<DraftPurchaseOrderLine>[] =
    useMemo(
      () => [
        {
          Cell: NumberInputCell,
          key: 'numberOfPacks',
          label: 'label.requested-packs',
          setter: patch => {
            // Adjust the requested and adjusted number of units based on the number of packs
            const adjustedPatch = calculateUnitQuantities(
              'numberOfPacks',
              status,
              patch,
              draft
            );
            updatePatch({ ...patch, ...adjustedPatch });
          },
        },
        {
          Cell: NumberInputCell,
          key: 'requestedPackSize',
          label: 'label.pack-size',
          setter: patch => {
            // Adjust the requested and adjusted number of units based on the new pack size
            const adjustedPatch = calculateUnitQuantities(
              'packSize',
              status,
              patch,
              draft
            );
            updatePatch({ ...patch, ...adjustedPatch });
          },
        },
        ...(status === PurchaseOrderNodeStatus.Confirmed
          ? [
              {
                Cell: NumberInputCell,
                key: 'adjustedNumberOfUnits',
                label: 'label.adjusted-quantity',
                setter: (patch: Partial<DraftPurchaseOrderLine>) => {
                  updatePatch({ ...patch });
                },
              },
            ]
          : []),
        {
          Cell: NumberInputCell,
          key: 'requestedNumberOfUnits',
          label: 'label.requested-quantity',
          setter: patch => {
            updatePatch({ ...patch });
          },
          cellProps: {
            isDisabled: status === PurchaseOrderNodeStatus.Confirmed,
          },
        },

        {
          Cell: NumberInputCell,
          key: 'pricePerUnitBeforeDiscount',
          label: 'label.price-per-unit-before-discount',
          setter: patch => {
            const adjustedPatch = calculatePricesAndDiscount(
              'pricePerUnitBeforeDiscount',
              patch
            );
            updatePatch({ ...patch, ...adjustedPatch });
          },
          cellProps: {
            decimalLimit: 2,
          },
        },
        {
          Cell: NumberInputCell,
          key: 'discountPercentage',
          label: 'label.discount-percentage',

          setter: patch => {
            const adjustedPatch = calculatePricesAndDiscount(
              'discountPercentage',
              patch
            );
            updatePatch({ ...patch, ...adjustedPatch });
          },
          cellProps: {
            decimalLimit: 2,
          },
        },
        {
          Cell: NumberInputCell,
          key: 'pricePerUnitAfterDiscount',
          label: 'label.price-per-unit-after-discount',
          setter: patch => {
            const adjustedPatch = calculatePricesAndDiscount(
              'pricePerUnitAfterDiscount',
              patch
            );
            updatePatch({ ...patch, ...adjustedPatch });
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
