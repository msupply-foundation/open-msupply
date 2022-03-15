import {
  isAlmostExpired,
  useCurrencyFormat,
  useColumns,
  NonNegativeNumberInputCell,
  ColumnAlign,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../types';

export const useOutboundLineEditColumns = ({
  onChange,
}: {
  onChange: (key: string, value: number, packSize: number) => void;
}) => {
  const updateDraftLine = (
    patch: Partial<DraftOutboundLine> & { id: string }
  ) => {
    const newValue = Math.min(
      patch.numberOfPacks ?? 0,
      patch.stockLine?.availableNumberOfPacks ?? 0
    );
    onChange?.(patch.id, newValue, patch.packSize ?? 1);
  };
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
      ['packSize', { width: 90 }],
      [
        'unitQuantity',
        {
          accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
          width: 90,
        },
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
        align: ColumnAlign.Center,
        width: 80,
      },
    ],
    {},
    [updateDraftLine]
  );

  return columns;
};
