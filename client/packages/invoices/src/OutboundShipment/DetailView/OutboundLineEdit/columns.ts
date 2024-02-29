import {
  useColumns,
  PositiveNumberCell,
  ColumnAlign,
  ExpiryDateCell,
  CheckCell,
  CurrencyCell,
  Column,
  useCurrency,
  LocationCell,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../types';
import { PackQuantityCell, StockOutLineFragment } from '../../../StockOut';

export const useOutboundLineEditColumns = ({
  onChange,
  unit,
}: {
  onChange: (key: string, value: number, packSize: number) => void;
  unit: string;
}) => {
  const { c } = useCurrency();
  const columns = useColumns<DraftStockOutLine>(
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
        'location',
        {
          accessor: ({ rowData }) => rowData.location?.code,
          width: 70,
          Cell: LocationCell,
        },
      ],
      ['packSize', { width: 90 }],
      [
        'sellPricePerPack',
        {
          // eslint-disable-next-line new-cap
          Cell: CurrencyCell(),
          formatter: sellPrice => c(Number(sellPrice)).format(),
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
          width: 120,
        },
      ],
      [
        'numberOfPacks',
        {
          Cell: PackQuantityCell,
          width: 120,
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

export const useExpansionColumns = (): Column<StockOutLineFragment>[] =>
  useColumns([
    'batch',
    'expiryDate',
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
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
