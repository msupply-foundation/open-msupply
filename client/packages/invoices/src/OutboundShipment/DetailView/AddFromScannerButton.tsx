import React from 'react';
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
  const { hasBarcodeScanner, isScanning, startScanning } =
    useBarcodeScannerContext();
  const { warning } = useNotification();

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content, gtin } = result;
      const barcode = gtin ?? content;
      const barcodes = await getBarcodes(barcode);

      if (barcodes.totalCount === 0) {
        // TODO: translate string
        warning('item not found')();
        // TODO: save barcode after selection
        onAddItem();
        return;
      }

      onAddItem({ id: barcodes.nodes[0]?.itemId } as ItemRowFragment);
    }
  };

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
        disabled={isScanning || isDisabled}
        onClick={() => startScanning(handleScanResult)}
        Icon={
          isScanning ? (
            <CircularProgress size={20} color="primary" />
          ) : (
            <ScanIcon />
          )
        }
        label={t('button.scan')}
      />
    </>
  );
};

export const AddFromScannerButton = React.memo(AddFromScannerButtonComponent);
