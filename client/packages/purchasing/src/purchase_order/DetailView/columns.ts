import {
  ColumnAlign,
  ColumnDescription,
  ColumnFormat,
  CurrencyCell,
  GenericColumnKey,
  getLinesFromRow,
  TooltipTextCell,
  useColumns,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { PackQuantityCell } from '@openmsupply-client/system';
import { PurchaseOrderLineFragment } from '../api';
import { usePurchaseOrderLineErrorContext } from '../context';

export const usePurchaseOrderColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { getError } = usePurchaseOrderLineErrorContext();

  const columnDefinitions: ColumnDescription<PurchaseOrderLineFragment>[] = [
    GenericColumnKey.Selection,
    {
      key: 'lineNumber',
      label: 'label.line-number',
      align: ColumnAlign.Right,
      width: 100,
      accessor: ({ rowData }) => rowData.lineNumber,
    },
    [
      'itemCode',
      {
        width: 130,
        accessor: ({ rowData }) => rowData.item.code,
        getSortValue: rowData => rowData.item.code,
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'ItemCannotBeOrdered'
          ),
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
        Math.ceil(
          (rowData.rowData.requestedNumberOfUnits ?? 0) /
            (rowData.rowData.requestedPackSize &&
            rowData.rowData.requestedPackSize !== 0
              ? rowData.rowData.requestedPackSize
              : 1)
        ),
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
      key: 'requestedNumberOfUnits',
      label: 'label.requested-quantity',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.requestedNumberOfUnits,
      getSortValue: rowData => rowData.requestedNumberOfUnits ?? 0,
    },
    {
      key: 'authorisedNumberOfUnits',
      label: 'label.adjusted-units',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.adjustedNumberOfUnits,
      getSortValue: rowData => rowData.adjustedNumberOfUnits ?? 0,
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
    {
      key: 'stockOnHand',
      label: 'label.soh',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.item.stats.stockOnHand,
      getSortValue: rowData => rowData.item.stats.stockOnHand ?? 0,
      defaultHideOnMobile: true,
    },
    {
      key: 'totalCost',
      label: 'label.total-cost',
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) =>
        (rowData.pricePerUnitAfterDiscount ?? 0) *
        (rowData.requestedNumberOfUnits ?? 0),
      getSortValue: rowData =>
        (rowData.pricePerUnitAfterDiscount ?? 0) *
        (rowData.requestedPackSize ?? 1),
    },
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
