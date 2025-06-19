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
      //   getSortValue: rowData => rowData.numberOfPacks,
    },
    {
      key: 'packSize',
      label: 'label.pack-size',
      //   description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.packSize,
      //   getSortValue: rowData => rowData.packSize,
      //   defaultHideOnMobile: true,
    },
    {
      key: 'requestedQuantity',
      label: 'label.requested-quantity',
      //   description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.requestedQuantity,
      //   getSortValue: rowData => rowData.packSize,
      //   defaultHideOnMobile: true,
    },
    {
      key: 'authorisedQuantity',
      label: 'label.authorized',
      //   description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.requestedQuantity,
      //   getSortValue: rowData => rowData.packSize,
      //   defaultHideOnMobile: true,
    },
    {
      key: 'totalReceived',
      label: 'label.total-received',
      //   description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.totalReceived,
      //   getSortValue: rowData => rowData.packSize,
      //   defaultHideOnMobile: true,
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
      //   description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.requestedDeliveryDate,
      //   getSortValue: rowData => rowData.packSize,
      //   defaultHideOnMobile: true,
    },
    {
      key: 'expectedDeliveryDate',
      label: 'label.expected-delivery-date',
      //   description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.expectedDeliveryDate,
      //   getSortValue: rowData => rowData.packSize,
      //   defaultHideOnMobile: true,
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
