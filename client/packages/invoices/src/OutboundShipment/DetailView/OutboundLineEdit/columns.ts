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
        'numberOfPacks',
        {
          Cell: NonNegativeIntegerCell,
          width: 100,
          label: 'label.num-packs',
          setter: ({ packSize, id, numberOfPacks }) =>
            onChange(id, numberOfPacks ?? 0, packSize ?? 1),
        },
      ],
      ['packSize', { width: 90 }],
      [
        'unitQuantity',
        {
          labelProps: { unit },
          accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
          width: 90,
        },
      ],
      {
        Cell: PositiveNumberCell,
        label: 'label.available',
        key: 'availableNumberOfPacks',
        align: ColumnAlign.Right,
        width: 85,
        accessor: ({ rowData }) => rowData.stockLine?.availableNumberOfPacks,
      },
      {
        Cell: PositiveNumberCell,
        label: 'label.in-store',
        key: 'totalNumberOfPacks',
        align: ColumnAlign.Right,
        width: 80,
        accessor: ({ rowData }) => rowData.stockLine?.totalNumberOfPacks,
      },
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
      [
        'sellPricePerPack',
        {
          Cell: CurrencyCell,
          formatter: sellPrice => useCurrencyFormat(Number(sellPrice)),
          width: 75,
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
