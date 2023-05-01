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
import {
  ItemRowFragment,
  MasterListSearchModal,
} from '@openmsupply-client/system';
import { useOutbound } from '../api';

export const AddFromScannerButtonComponent = ({
  onAddItem,
}: {
  onAddItem: (item?: ItemRowFragment) => void;
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
  const { warning } = useNotification();

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content, gtin } = result;
      const barcode = gtin ?? content;
      const barcodes = await getBarcodes(barcode);

      if (barcodes.totalCount === 0) {
        warning(t('error.no-matching-item'))();
        // TODO: save barcode after selection
        onAddItem();
        return;
      }

      onAddItem({ id: barcodes.nodes[0]?.itemId } as ItemRowFragment);
    }
  };

  const handleClick = () => {
    if (isScanning) {
      stopScan();
    } else {
      startScanning(handleScanResult);
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
