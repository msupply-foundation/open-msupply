import {
  ColumnAlign,
  ColumnDescription,
  ColumnFormat,
  GenericColumnKey,
  TooltipTextCell,
  useColumns,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { PackQuantityCell } from '@openmsupply-client/system';
import { PurchaseOrderLineFragment } from '../api';

export const usePurchaseOrderColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });

  const columnDefinitions: ColumnDescription<PurchaseOrderLineFragment>[] = [
    GenericColumnKey.Selection,
    [
      'itemCode',
      {
        width: 130,
        accessor: ({ rowData }) => rowData.item.code,
        getSortValue: rowData => rowData.item.code,
      },
    ],
    [
      'itemName',
      {
        Cell: TooltipTextCell,
        width: 350,
        accessor: ({ rowData }) => rowData.item.name,
        getSortValue: rowData => rowData.item.name,
      },
    ],
    {
      key: 'numberOfPacks',
      label: 'label.num-packs',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackQuantityCell,
      accessor: rowData =>
        Math.ceil((rowData.rowData.requestedNumberOfUnits ?? 0) /
        ((rowData.rowData.requestedPackSize && rowData.rowData.requestedPackSize !== 0) ? rowData.rowData.requestedPackSize : 1)),
    },
    {
      key: 'packSize',
      label: 'label.pack-size',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.requestedPackSize,
      getSortValue: rowData => rowData.requestedPackSize ?? 1,
      defaultHideOnMobile: true,
    },
    {
      key: 'requestedQuantity',
      label: 'label.requested-quantity',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.requestedNumberOfUnits,
      getSortValue: rowData => rowData.requestedNumberOfUnits ?? 0,
    },
    {
      key: 'authorisedQuantity',
      label: 'label.authorised-quantity',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.authorisedNumberOfUnits,
      getSortValue: rowData => rowData.authorisedNumberOfUnits ?? 0,
    },
    {
      key: 'totalReceived',
      label: 'label.total-received',
      align: ColumnAlign.Right,
      accessor: ({ rowData: _ }) => '',
      // TODO: GOOD RECEIVED CALC
      // rowData.totalReceived,
      // getSortValue: rowData =>  //rowData.totalReceived ?? 0,
    },
    // TO-DO: Figure out if this is snapshot value or current value
    // {
    //   key: 'availableStockOnHand',
    //   label: 'label.available-soh',
    //   description: 'description.available-soh',
    //   align: ColumnAlign.Right,
    //   width: 200,
    //   accessor: ({ rowData }) => rowData.itemStats.availableStockOnHand,
    //   getSortValue: rowData => rowData.itemStats.availableStockOnHand,
    // },
    // TO-DO: Include all orders or just POs?
    //   {
    //   key: 'onOrder',
    //   label: 'label.on-order',
    //   //   description: 'description.default-pack-size',
    //   align: ColumnAlign.Right,
    //   accessor: ({ rowData }) => rowData.totalReceived,
    //   //   getSortValue: rowData => rowData.packSize,
    //   //   defaultHideOnMobile: true,
    // },
    // TO-DO: Price extension column
    {
      key: 'requestedDeliveryDate',
      label: 'label.requested-delivery-date',
      align: ColumnAlign.Right,
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.requestedDeliveryDate,
      getSortValue: rowData => rowData.requestedDeliveryDate ?? '1000-01-01',
    },
    {
      key: 'expectedDeliveryDate',
      label: 'label.expected-delivery-date',
      align: ColumnAlign.Right,
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.expectedDeliveryDate,
      getSortValue: rowData => rowData.expectedDeliveryDate ?? '1000-01-01',
    },
  ];

  const columns = useColumns<PurchaseOrderLineFragment>(
    columnDefinitions,
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery };
};
