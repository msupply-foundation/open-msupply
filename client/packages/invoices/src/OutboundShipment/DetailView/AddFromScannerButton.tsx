import React, { useEffect } from 'react';
import {
  useTranslation,
  useToggle,
  InvoiceNodeStatus,
  useBarcodeScannerContext,
  CircularProgress,
  ScanIcon,
  ScanResult,
  ButtonWithIcon,
  useNotification,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { Draft, useOutbound } from '../api';

export const AddFromScannerButtonComponent = ({
  onAddItem,
}: {
  onAddItem: (draft?: Draft) => void;
}) => {
  const t = useTranslation('distribution');
  const { status } = useOutbound.document.fields(['status']);
  const isDisabled = status !== InvoiceNodeStatus.New;
  const { addFromMasterList } = useOutbound.utils.addFromMasterList();
  const { mutateAsync: getBarcodes } = useOutbound.utils.barcodes();
  const { otherPartyId } = useOutbound.document.fields(['otherPartyId']);
  const modalController = useToggle();
  const filterByName = { existsForNameId: { equalTo: otherPartyId } };
  const { hasBarcodeScanner, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { error, warning } = useNotification();

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content, gtin, batch } = result;
      const value = gtin ?? content;
      const barcodes = await getBarcodes(value);

      if (barcodes.totalCount > 0) {
        const barcode = barcodes.nodes[0];
        const id = barcode?.itemId;

        if (!!id) {
          onAddItem({
            item: { id },
            barcode: { ...barcode, batch },
          });
          return;
        }
      }

      warning(t('error.no-matching-item'))();

      onAddItem({ barcode: { value, batch } });
    }
  };

  const handleClick = async () => {
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

  if (!hasBarcodeScanner) return null;

  return (
    <>
      <MasterListSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={masterList => {
          modalController.toggleOff();
          addFromMasterList(masterList);
        }}
        filterBy={filterByName}
      />
      <ButtonWithIcon
        disabled={isDisabled}
        onClick={handleClick}
        Icon={
          isScanning ? (
            <CircularProgress size={20} color="primary" />
          ) : (
            <ScanIcon />
          )
        }
        label={t(isScanning ? 'button.stop' : 'button.scan')}
      />
    </>
  );
};

export const AddFromScannerButton = React.memo(AddFromScannerButtonComponent);
