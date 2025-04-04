import React, { ReactElement } from 'react';
import {
  useColumns,
  TooltipTextCell,
  useIsCentralServerApi,
  ColumnDescription,
  ColumnAlign,
  DotCell,
  ColumnFormat,
  GenericColumnKey,
  SortBy,
  usePathnameIncludes,
} from '@openmsupply-client/common';

import { Status } from '../Components';
import { AssetRowFragment } from '../api/operations.generated';

const StatusCell = ({
  rowData,
}: {
  rowData: AssetRowFragment;
}): ReactElement => {
  return <Status status={rowData.statusLog?.status} />;
};

interface AssetColumns {
  sortBy: SortBy<unknown>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

export const useAssetColumns = ({ sortBy, onChangeSortBy }: AssetColumns) => {
  const isColdChain = usePathnameIncludes('cold-chain');
  const isCentralServer = useIsCentralServerApi();

  const columnsToCreate: ColumnDescription<AssetRowFragment>[] = [
    GenericColumnKey.Selection,
  ];

  if (isCentralServer && !isColdChain)
    columnsToCreate.push({
      key: 'store',
      label: 'label.store',
      accessor: ({ rowData }) => rowData.store?.storeName,
    });

  columnsToCreate.push(
    {
      key: 'assetNumber',
      width: 150,
      label: 'label.asset-number',
    },
    {
      key: 'categoryName',
      label: 'label.category',
      sortable: false,
      width: 200,
      accessor: ({ rowData }) => rowData.assetCategory?.name,
      Cell: TooltipTextCell,
    },
    {
      key: 'type',
      label: 'label.type',
      sortable: false,
      width: 200,
      accessor: ({ rowData }) => rowData.assetType?.name,
      Cell: TooltipTextCell,
    },
    {
      key: 'manufacturer',
      Cell: TooltipTextCell,
      maxWidth: 200,
      label: 'label.manufacturer',
      sortable: false,
      accessor: ({ rowData }) => rowData.catalogueItem?.manufacturer,
    },
    {
      key: 'model',
      label: 'label.model',
      sortable: false,
      accessor: ({ rowData }) => rowData.catalogueItem?.model,
    },
    {
      key: 'status',
      label: 'label.functional-status',
      Cell: StatusCell,
      sortable: false,
    },
    {
      key: 'serialNumber',
      label: 'label.serial',
    },
    {
      key: 'catalogueItem',
      label: 'label.non-catalogue',
      accessor: ({ rowData }) => !rowData.catalogueItem,
      align: ColumnAlign.Center,
      Cell: DotCell,
      sortable: false,
    },
    {
      key: 'installationDate',
      label: 'label.installation-date',
      format: ColumnFormat.Date,
    },
    {
      key: 'notes',
      label: 'label.notes',
      sortable: false,
    }
  );

  return useColumns(
    columnsToCreate,
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy]
  );
};
