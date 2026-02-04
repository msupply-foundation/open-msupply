import React from 'react';
import {
  useNavigate,
  NothingHere,
  useTranslation,
  useToggle,
  RouteBuilder,
  usePathnameIncludes,
  MaterialTable,
  usePaginatedMaterialTable,
  MobileCardList,
  useIsGapsStoreOnly,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { CreateAssetModal } from './CreateAssetModal';
import { EquipmentImportModal } from '../ImportAsset';
import { AssetRowFragment } from '../api/operations.generated';
import { AppRoute } from '@openmsupply-client/config';
import { Footer } from './Footer';
import { useAssetColumns } from './columns';

export const EquipmentListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const isColdChain = usePathnameIncludes('cold-chain');

  const modalController = useToggle();
  const importModalController = useToggle();

  const { data, isError, isFetching } = useAssets.document.list();

  const handleRowClick = (row: AssetRowFragment): void => {
    const appRoute = isColdChain ? AppRoute.Coldchain : AppRoute.Manage;
    const path = RouteBuilder.create(appRoute)
      .addPart(AppRoute.Equipment)
      .addPart(row.id)
      .build();
    navigate(path);
  };

  const columns = useAssetColumns();

  const isMobile = useIsGapsStoreOnly();

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'equipment-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isError,
    isLoading: isFetching,
    onRowClick: handleRowClick,
    noDataElement: <NothingHere body={t('error.no-items-to-display')} />,
    isMobile,
  });

  return (
    <>
      <AppBarButtons
        importModalController={importModalController}
        modalController={modalController}
      />
      {isMobile ? (
        <MobileCardList table={table} />
      ) : (
        <MaterialTable table={table} />
      )}

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
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
