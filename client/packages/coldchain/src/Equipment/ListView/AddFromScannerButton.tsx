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
  useDisabledNotification,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AssetFragment } from '../api';
import { AppRoute } from '@openmsupply-client/config';

export const AddFromScannerButtonComponent = ({
  assets,
}: {
  assets: AssetFragment[];
}) => {
  const t = useTranslation('coldchain');
  const { isConnected, isEnabled, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { error } = useNotification();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { DisabledNotification, show } = useDisabledNotification({
    title: t('error.unable-to-scan'),
    message: t('error.scanner-not-connected'),
  });
  const equipmentRoute = RouteBuilder.create(AppRoute.Coldchain).addPart(
    AppRoute.Equipment
  );

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content } = result;
      const id = content;
      if (assets.some(asset => asset.id === id)) {
        navigate(equipmentRoute.addPart(id).build());
        return;
      }

      error(t('error.no-matching-asset', { id }))();
    }
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
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
        onClick={handleClick}
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
