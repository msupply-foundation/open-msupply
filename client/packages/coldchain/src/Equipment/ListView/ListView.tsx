import React, { FC, ReactNode } from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  useToggle,
  TooltipTextCell,
  useIsCentralServerApi,
  ColumnDescription,
  ColumnAlign,
  DotCell,
  RouteBuilder,
  ColumnFormat,
  GenericColumnKey,
  SortBy,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { CreateAssetModal } from './CreateAssetModal';
import { EquipmentImportModal } from '../ImportAsset';
import { Status } from '../Components';
import { AssetRowFragment } from '../api/operations.generated';
import { AppRoute } from '@openmsupply-client/config';
import { Footer } from './Footer';

const StatusCell = ({ rowData }: { rowData: AssetRowFragment }): ReactNode => {
  return <Status status={rowData.statusLog?.status} />;
};

interface AssetColumns {
  sortBy: SortBy<unknown>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

export const useAssetColumns = ({ sortBy, onChangeSortBy }: AssetColumns) => {
  const isCentralServer = useIsCentralServerApi();

  const columnsToCreate: ColumnDescription<AssetRowFragment>[] = [
    GenericColumnKey.Selection,
  ];

  if (isCentralServer)
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

const AssetList: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  const modalController = useToggle();
  const importModalController = useToggle();

  const { data, isError, isLoading } = useAssets.document.list();

  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'installationDate', dir: 'desc' },
  });
  const pagination = { page, first, offset };

  const columns = useAssetColumns({
    sortBy,
    onChangeSortBy: updateSortQuery,
  });

  const handleRowClick = (row: AssetRowFragment): void => {
    const path = RouteBuilder.create(AppRoute.Coldchain)
      .addPart(AppRoute.Equipment)
      .addPart(row.id)
      .build();
    navigate(path);
  };

  return (
    <>
      <AppBarButtons
        importModalController={importModalController}
        modalController={modalController}
      />
      <Toolbar />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        noDataElement={<NothingHere body={t('error.no-items-to-display')} />}
        enableColumnSelection
      />
      <Footer />
      <CreateAssetModal
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
      />
      <EquipmentImportModal
        isOpen={importModalController.isOn}
        onClose={importModalController.toggleOff}
      />
    </>
  );
};

export const EquipmentListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetList />
  </TableProvider>
);
