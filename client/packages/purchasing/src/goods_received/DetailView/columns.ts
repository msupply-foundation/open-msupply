import {
  ColumnAlign,
  ColumnDescription,
  GenericColumnKey,
  TooltipTextCell,
  useColumns,
  useUrlQueryParams,
} from '@openmsupply-client/common/src';
import { GoodsReceivedLineFragment } from '../api/operations.generated';
import { PackQuantityCell } from '@openmsupply-client/system';

export const useGoodsReceivedColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });

  const columnDefinitions: ColumnDescription<GoodsReceivedLineFragment>[] = [
    GenericColumnKey.Selection,
    [
      'lineNumber',
      {
        width: 160,
        accessor: ({ rowData }) => rowData.lineNumber,
        getSortValue: rowData => rowData.lineNumber ?? 0,
      },
    ],
    [
      'itemCode',
      {
        width: 90,
        accessor: ({ rowData }) => rowData.item.code,
        getSortValue: rowData => rowData.item.code,
      },
    ],
    [
      'itemName',
      {
        Cell: TooltipTextCell,
        width: 300,
        accessor: ({ rowData }) => rowData.item.name,
        getSortValue: rowData => rowData.item.name,
      },
    ],
    {
      key: 'batch',
      label: 'label.batch',
      align: ColumnAlign.Left,
      width: 150,
      accessor: ({ rowData }) => rowData.batch ?? '',
      getSortValue: rowData => rowData.batch ?? '',
    },
    {
      key: 'expiryDate',
      label: 'label.expiry-date',
      align: ColumnAlign.Left,
      width: 150,
      accessor: ({ rowData }) => rowData.expiryDate ?? '',
      getSortValue: rowData => rowData.expiryDate ?? '',
    },
    {
      key: 'packSize',
      label: 'label.pack-size',
      align: ColumnAlign.Right,
      width: 150,
      accessor: ({ rowData }) => rowData.receivedPackSize,
      getSortValue: rowData => rowData.receivedPackSize ?? 1,
      defaultHideOnMobile: true,
    },
    {
      key: 'numberOfPacks',
      label: 'label.num-packs',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackQuantityCell,
      accessor: rowData =>
        Math.ceil(
          (rowData.rowData.numberOfPacksReceived ?? 0) /
            (rowData.rowData.receivedPackSize &&
            rowData.rowData.receivedPackSize !== 0
              ? rowData.rowData.receivedPackSize
              : 1)
        ),
    },
  ];

  const columns = useColumns<GoodsReceivedLineFragment>(
    columnDefinitions,
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery };
};
