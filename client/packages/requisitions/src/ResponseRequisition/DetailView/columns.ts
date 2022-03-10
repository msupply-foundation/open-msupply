import {
  useColumns,
  GenericColumnKey,
  SortBy,
  Column,
  ColumnAlign,
} from '@openmsupply-client/common';
import { ResponseLineFragment } from './../api';

interface UseResponseColumnOptions {
  sortBy: SortBy<ResponseLineFragment>;
  onChangeSortBy: (
    column: Column<ResponseLineFragment>
  ) => SortBy<ResponseLineFragment>;
}

export const useResponseColumns = ({
  onChangeSortBy,
  sortBy,
}: UseResponseColumnOptions): Column<ResponseLineFragment>[] =>
  useColumns<ResponseLineFragment>(
    [
      ['itemCode', { accessor: ({ rowData }) => rowData.item.code }],
      ['itemName', { accessor: ({ rowData }) => rowData.item.name }],
      ['itemUnit', { accessor: ({ rowData }) => rowData.item.unitName }],
      [
        'stockOnHand',
        {
          accessor: ({ rowData }) => rowData.itemStats.availableStockOnHand,
          label: 'label.our-soh',
          description: 'description.our-soh',
        },
      ],
      [
        'stockOnHand',
        {
          accessor: ({ rowData }) =>
            rowData.linkedRequisitionLine?.itemStats?.availableStockOnHand,
          label: 'label.customer-soh',
          description: 'description.customer-soh',
        },
      ],
      'requestedQuantity',
      {
        label: 'label.already-issued',
        description: 'description.already-issued',
        key: 'alreadyIssued',
        width: 100,
        align: ColumnAlign.Right,
        accessor: ({ rowData }) =>
          rowData.supplyQuantity - rowData.remainingQuantityToSupply,
      },
      {
        label: 'label.remaining-to-supply',
        description: 'description.remaining-to-supply',
        key: 'remainingToSupply',
        width: 100,
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => rowData.remainingQuantityToSupply,
      },
      'supplyQuantity',
      'comment',
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
