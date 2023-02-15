import {
  useCurrencyFormat,
  useColumns,
  PositiveNumberCell,
  ColumnAlign,
  ExpiryDateCell,
  CheckCell,
  CurrencyCell,
  NonNegativeIntegerCell,
  Column,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../types';
import { OutboundLineFragment } from '../../api';

export const useOutboundLineEditColumns = ({
  onChange,
  unit,
}: {
  onChange: (key: string, value: number, packSize: number) => void;
  unit: string;
}) => {
  const columns = useColumns<DraftOutboundLine>(
    [
      [
        'batch',
        {
          accessor: ({ rowData }) => rowData.stockLine?.batch,
        },
      ],
      [
        'expiryDate',
        {
          Cell: ExpiryDateCell,
          width: 80,
        },
      ],
      [
        'locationName',
        {
          accessor: ({ rowData }) => rowData.location?.name,
          width: 70,
        },
      ],
      ['packSize', { width: 90 }],
      [
        'sellPricePerPack',
        {
          Cell: CurrencyCell,
          formatter: sellPrice => useCurrencyFormat(Number(sellPrice)),
          width: 120,
        },
      ],
      {
        label: 'label.on-hold',
        key: 'onHold',
        Cell: CheckCell,
        accessor: ({ rowData }) => rowData.stockLine?.onHold,
        align: ColumnAlign.Center,
        width: 80,
      },
      {
        Cell: PositiveNumberCell,
        label: 'label.in-store',
        key: 'totalNumberOfPacks',
        align: ColumnAlign.Right,
        width: 80,
        accessor: ({ rowData }) => rowData.stockLine?.totalNumberOfPacks,
      },
      {
        Cell: PositiveNumberCell,
        label: 'label.available-packs',
        key: 'availableNumberOfPacks',
        align: ColumnAlign.Right,
        width: 85,
        accessor: ({ rowData }) => rowData.stockLine?.availableNumberOfPacks,
      },
      [
        'unitQuantity',
        {
          label: 'label.unit-quantity-issued',
          labelProps: { unit },
          accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
          width: 90,
        },
      ],
      [
        'numberOfPacks',
        {
          Cell: NonNegativeIntegerCell,
          width: 100,
          label: 'label.pack-quantity-issued',
          setter: ({ packSize, id, numberOfPacks }) =>
            onChange(id, numberOfPacks ?? 0, packSize ?? 1),
        },
      ],
    ],
    {},
    [onChange]
  );

  return columns;
};

export const useExpansionColumns = (): Column<OutboundLineFragment>[] =>
  useColumns([
    'batch',
    'expiryDate',
    [
      'locationName',
      {
        accessor: ({ rowData }) => rowData.location?.name,
      },
    ],
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item?.unitName,
      },
    ],
    'numberOfPacks',
    'packSize',
    [
      'unitQuantity',
      {
        accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
      },
    ],
    [
      'sellPricePerUnit',
      {
        accessor: ({ rowData }) => rowData.sellPricePerPack,
      },
    ],
  ]);
