import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { AssetFragment, useAssets } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { CreateAssetModal } from './CreateAssetModal';
import { Status } from '../Components';

const StatusCell = ({ rowData }: { rowData: AssetFragment }) => {
  return <Status status={rowData.statusLog?.status} />;
};

const AssetListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'installationDate', dir: 'desc' },
  });

  const { data, isError, isLoading } = useAssets.document.list();
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const modalController = useToggle();
  const isCentralServer = useIsCentralServerApi();

  const columnsToCreate: ColumnDescription<AssetFragment>[] = [
    {
      key: 'assetNumber',
      width: 150,
      sortable: false,
      label: 'label.asset-number',
    },
    {
      key: 'type',
      label: 'label.type',
      sortable: false,
      width: 200,
      accessor: ({ rowData }) => rowData.catalogueItem?.assetType?.name,
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
  ];

  if (isCentralServer)
    columnsToCreate.push({
      key: 'store',
      label: 'label.store',
      accessor: ({ rowData }) => rowData.store?.code,
      sortable: false,
    });

  columnsToCreate.push(
    {
      key: 'notes',
      label: 'label.notes',
      sortable: false,
    },
    'selection'
  );

  const columns = useColumns<AssetFragment>(
    columnsToCreate,
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <CreateAssetModal
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
      />
      <AppBarButtons modalController={modalController} />
      <Toolbar />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/cold-chain/equipment/${row.id}`);
        }}
        noDataElement={<NothingHere body={t('error.no-items')} />}
        enableColumnSelection
      />
    </>
  );
};

export const EquipmentListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetListComponent />
  </TableProvider>
);
