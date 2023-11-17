import {
  useColumns,
  PositiveNumberCell,
  ColumnAlign,
  ExpiryDateCell,
  CheckCell,
  CurrencyCell,
  useCurrency,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../types';
import { PackQuantityCell } from '../../../StockOut';
import { PackVariantCell } from '@openmsupply-client/system';

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
        'locationName',
        {
          accessor: ({ rowData }) => rowData.location?.name,
          width: 70,
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
      [
        'sellPricePerPack',
        {
          Cell: CurrencyCell,
          formatter: sellPrice => c(Number(sellPrice)).format(),
          width: 120,
        },
      ],
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
      {
        key: 'packUnit',
        label: 'label.pack',
        sortable: false,
        Cell: PackVariantCell({
          getItemId: row => row?.item.id,
          getPackSizes: row => [row.packSize ?? 1],
          getUnitName: row => row?.item.unitName ?? null,
        }),
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
