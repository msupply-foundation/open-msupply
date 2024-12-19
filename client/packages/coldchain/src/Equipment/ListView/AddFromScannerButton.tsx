import React, { useEffect, useRef } from 'react';
import {
  useTranslation,
  useBarcodeScannerContext,
  CircularProgress,
  ScanIcon,
  ScanResult,
  ButtonWithIcon,
  useNotification,
  useRegisterActions,
  Box,
  useNavigate,
  useDisabledNotificationPopover,
  RouteBuilder,
  useConfirmationModal,
  FnUtils,
  AssetLogStatusInput,
  UserPermission,
  useAuthContext,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useAssets } from '../api';
import { DraftAsset } from '../types';

export const AddFromScannerButtonComponent = () => {
  const t = useTranslation();
  const { isConnected, isEnabled, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { error, info } = useNotification();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { DisabledNotification, show } = useDisabledNotificationPopover({
    title: t('error.unable-to-scan'),
    message: t('error.scanner-not-connected'),
  });
  const equipmentRoute = RouteBuilder.create(AppRoute.Coldchain).addPart(
    AppRoute.Equipment
  );
  const { mutateAsync: fetchAsset } = useAssets.document.fetch();
  const { mutateAsync: fetchFromGS1 } = useAssets.document.gs1();
  const { mutateAsync: saveNewAsset } = useAssets.document.insert();
  const { insertLog, invalidateQueries } = useAssets.log.insert();
  const newAssetData = useRef<DraftAsset>();

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
                comment: t('label.created'),
                status: AssetLogStatusInput.Functioning,
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
      const permission = UserPermission.AssetMutate;
      if (userHasPermission(permission)) {
        newAssetData.current = {
          ...asset,
          id: FnUtils.generateUUID(),
          locationIds: [],
          parsedProperties: {},
          parsedCatalogProperties: {},
        };
        showCreateConfirmation();
      } else info(t('error.no-asset-create-permission'))();
    }
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const permission = UserPermission.AssetQuery;

    if (!userHasPermission(permission)) {
      info(t('error.no-asset-view-permission'))();
      return;
    }
    if (!isConnected) {
      show(e);
      return;
    }
    buttonRef.current?.blur();
    if (isScanning) {
      stopScan();
    } else {
      try {
        await startScanning(handleScanResult);
      } catch (e) {
        error(t('error.unable-to-start-scanning', { error: e }))();
      }
    }
  };

  //   stop scanning when the component unloads
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  const label = t(isScanning ? 'button.stop' : 'button.scan');
  useRegisterActions(
    [
      {
        id: 'action:scan-barcode',
        name: `${label} (Ctrl+s)`,
        shortcut: ['Control+s'],
        keywords: 'drawer, close',
        perform: () => buttonRef.current?.click(),
      },
    ],
    [isScanning]
  );

  if (!isEnabled) return null;

  return (
    <Box>
      <ButtonWithIcon
        ref={buttonRef}
        onClick={e => {
          handleClick(e);
        }}
        Icon={
          isScanning ? (
            <CircularProgress size={20} color="primary" />
          ) : (
            <ScanIcon />
          )
        }
        label={label}
      />
      <DisabledNotification />
    </Box>
  );
};

export const AddFromScannerButton = React.memo(AddFromScannerButtonComponent);
