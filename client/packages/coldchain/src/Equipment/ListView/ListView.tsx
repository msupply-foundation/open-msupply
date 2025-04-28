import React, { FC } from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  useToggle,
  RouteBuilder,
  usePathnameIncludes,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { CreateAssetModal } from './CreateAssetModal';
import { EquipmentImportModal } from '../ImportAsset';
import { AssetRowFragment } from '../api/operations.generated';
import { AppRoute } from '@openmsupply-client/config';
import { Footer } from './Footer';
import { useAssetColumns } from './columns';

const AssetList = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const isColdChain = usePathnameIncludes('cold-chain');

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
    const appRoute = isColdChain ? AppRoute.Coldchain : AppRoute.Manage;
    const path = RouteBuilder.create(appRoute)
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
