import React, { useRef } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  PlusCircleIcon,
  ToggleState,
  UploadIcon,
  UserPermission,
  useCallbackWithPermission,
  useIsCentralServerApi,
  ScanResult,
  useNavigate,
  RouteBuilder,
  useNotification,
  useAuthContext,
  useConfirmationModal,
  AssetLogStatusNodeType,
  FnUtils,
  useBarcodeScannerContext,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { useAssets } from '../api';
import { assetsToCsv } from '../utils';
import { AddFromScannerButton } from '@openmsupply-client/invoices/src/OutboundShipment/DetailView/AddFromScannerButton';
import { useAssetProperties } from '@openmsupply-client/system';
import { DraftAsset } from '../types';

interface AppBarButtonsComponentProps {
  importModalController: ToggleState;
  modalController: ToggleState;
}

export const AppBarButtonsComponent = ({
  importModalController,
  modalController,
}: AppBarButtonsComponentProps) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  const { fetchAsync, isLoading } = useAssets.document.listAll();
  const { data: properties } = useAssetProperties();

  const navigate = useNavigate();
  const { mutateAsync: fetchAsset } = useAssets.document.fetch();
  const { mutateAsync: fetchFromGS1 } = useAssets.document.gs1();
  const { mutateAsync: saveNewAsset } = useAssets.document.insert();
  const { insertLog, invalidateQueries } = useAssets.log.insert();
  const newAssetData = useRef<DraftAsset>();

  const equipmentRoute = RouteBuilder.create(AppRoute.Coldchain).addPart(
    AppRoute.Equipment
  );

  const { error, info } = useNotification();

  const { userHasPermission } = useAuthContext();

  const showCreateConfirmation = useConfirmationModal({
    onConfirm: () => {
      if (newAssetData.current) {
        saveNewAsset(newAssetData.current)
          .then(async () => {
            if (newAssetData.current) {
              await insertLog({
                id: FnUtils.generateUUID(),
                assetId: newAssetData.current.id,
                comment: t('message.asset-created'),
                status: AssetLogStatusNodeType.Functioning,
              });
              invalidateQueries();
              navigate(equipmentRoute.addPart(newAssetData.current.id).build());
            }
          })
          .catch(e => error(t('error.unable-to-save-asset', { error: e }))());
      }
    },
    title: t('heading.create-new-asset'),
    message: t('messages.create-new-asset-confirmation'),
  });

  const handleUploadAssetClick = useCallbackWithPermission(
    UserPermission.AssetMutate,
    importModalController.toggleOn,
    t('error.no-asset-import-permission')
  );

  const handleCreateAssetClick = useCallbackWithPermission(
    UserPermission.AssetMutate,
    modalController.toggleOn,
    t('error.no-asset-create-permission')
  );

  const getCsvData = async () => {
    const result = await fetchAsync();
    return result?.nodes?.length
      ? assetsToCsv(
          result.nodes,
          t,
          properties?.map(p => p.key) ?? [],
          isCentralServer
        )
      : null;
  };

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { gs1 } = result;

      if (!gs1) {
        // try to fetch the asset by id, as it could be an id from our own barcode
        const { content: id } = result;
        const asset = await fetchAsset(id).catch(() => {});
        if (asset) {
          navigate(equipmentRoute.addPart(id).build());

          return;
        }
        error(t('error.no-matching-asset', { id }))();
        return;
      }

      // send the GS1 data to backend to handle
      const asset = await fetchFromGS1(gs1).catch(() => {});

      if (asset?.__typename !== 'AssetNode') {
        error(t('error.no-matching-asset', { id: result.content }))();
        return;
      }
      if (asset?.id) {
        navigate(equipmentRoute.addPart(asset?.id).build());
        return;
      }

      // If not existing, offer to create from the parsed GS1 data
      const permission = UserPermission.AssetMutateViaDataMatrix;
      if (userHasPermission(permission)) {
        newAssetData.current = {
          ...asset,
          id: FnUtils.generateUUID(),
          locationIds: [],
          parsedProperties: {},
          parsedCatalogProperties: {},
        };
        showCreateConfirmation();
      } else info(t('error.no-asset-create-scan-permission'))();
    }
  };

  useBarcodeScannerContext(handleScanResult);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<UploadIcon />}
          label={t('button.upload-assets')}
          onClick={handleUploadAssetClick}
        />
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-asset')}
          onClick={handleCreateAssetClick}
        />
        <AddFromScannerButton
          initialListening={false}
          handleClickCheck={() => {
            const permission = UserPermission.AssetQuery;

            if (!userHasPermission(permission)) {
              info(t('error.no-asset-view-permission'))();
              return false;
            }
            return true;
          }}
        />
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.cold-chain-equipment')}
          isLoading={isLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
