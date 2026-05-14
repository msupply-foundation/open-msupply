import React, { useEffect, useRef, useState } from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  useTabs,
  ModalMode,
  Box,
  AlertColor,
  useNotification,
} from '@openmsupply-client/common';
import { ItemSelector } from './ItemSelector';
import { ReturnSteps, Tabs } from './ReturnSteps';
import { useReturns } from '../../api';
import { useDraftCustomerReturnLines } from './useDraftCustomerReturnLines';

interface CustomerReturnEditModalProps {
  isOpen: boolean;
  outboundShipmentLineIds: string[];
  customerId: string;
  onClose: () => void;
  modalMode: ModalMode | null;
  returnId?: string;
  outboundShipment?: {
    id: string;
    invoiceNumber: number;
    otherPartyName: string;
  };
  initialItemId?: string | null;
  loadNextItem?: () => void;
  hasNextItem?: boolean;
  isNewReturn?: boolean;
  onCreate?: () => void;
}

export const CustomerReturnEditModal = ({
  isOpen,
  outboundShipmentLineIds,
  customerId,
  onClose,
  modalMode,
  returnId,
  initialItemId,
  outboundShipment,
  loadNextItem,
  hasNextItem = false,
  isNewReturn = false,
  onCreate,
}: CustomerReturnEditModalProps) => {
  const t = useTranslation();
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);
  const { success, error } = useNotification();

  const [itemId, setItemId] = useState<string | undefined>(
    initialItemId ?? undefined
  );

  const alertRef = useRef<HTMLDivElement>(null);

  const [zeroQuantityAlert, setZeroQuantityAlert] = useState<
    AlertColor | undefined
  >();
  const [packSizeAlert, setPackSizeAlert] = useState(false);

  const defaultReference =
    isNewReturn && outboundShipment
      ? t('messages.default-customer-return-reference', {
          invoiceNumber: outboundShipment.invoiceNumber,
        })
      : '';
  const [theirReference, setTheirReference] = useState(defaultReference);

  // For existing returns, initialise theirReference from the return data once
  // loaded
  const { data: returnData } = useReturns.document.customerReturn();
  useEffect(() => {
    if (!isNewReturn && returnData?.theirReference !== undefined) {
      setTheirReference(returnData.theirReference ?? '');
    }
  }, [returnData?.theirReference, isNewReturn]);

  // The customerIsDisabled hook returns true when there is no data, so in the
  // case of a new return, we want to make sure it is *not* disabled
  const isDisabled = useReturns.utils.customerIsDisabled() && !isNewReturn;

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { lines, update, save, addDraftLine } = useDraftCustomerReturnLines({
    outboundShipmentLineIds,
    customerId,
    returnId,
    itemId,
    outboundShipmentId: outboundShipment?.id,
  });

  useEffect(() => {
    if (initialItemId === undefined) return;
    setItemId(initialItemId === null ? undefined : initialItemId);
  }, [initialItemId]);

  const onOk = async () => {
    try {
      const customerReturn = !isDisabled && (await save(theirReference));
      onCreate?.();
      !!customerReturn &&
        customerReturn?.originalShipment?.id &&
        isNewReturn &&
        success(t('messages.customer-return-created-verified'))();
      onClose();
    } catch (e) {
      const errorMessage =
        (e as Error)?.message ?? t('error.failed-to-save-return');
      error(errorMessage)();
    }
  };

  const handleNextItem = async () => {
    try {
      !isDisabled && (await save());
      loadNextItem && loadNextItem();
      onChangeTab(Tabs.Quantity);
    } catch (e) {
      const errorMessage =
        (e as Error)?.message ?? t('error.failed-to-save-return');
      error(errorMessage)();
    }
  };

  const handleNextStep = () => {
    const hasReturnedLines = lines.some(
      line => line.numberOfPacksReturned !== 0
    );
    const hasInvalidPackSize = lines.some(line => line.packSize < 1);

    setPackSizeAlert(hasInvalidPackSize);

    if (!hasReturnedLines) {
      switch (modalMode) {
        case ModalMode.Create: {
          setZeroQuantityAlert('error');
          break;
        }
        case ModalMode.Update: {
          setZeroQuantityAlert('warning');
          break;
        }
      }
    } else {
      setZeroQuantityAlert(undefined);
    }

    if (!hasInvalidPackSize && hasReturnedLines) {
      onChangeTab(Tabs.Reason);
      return;
    }
    alertRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const CancelButton = <DialogButton onClick={onClose} variant="cancel" />;
  const BackButton = (
    <DialogButton onClick={() => onChangeTab(Tabs.Quantity)} variant="back" />
  );
  const NextStepButton = (
    <DialogButton
      onClick={handleNextStep}
      variant="next-and-ok"
      disabled={!lines.length}
      customLabel={t('button.next-step')}
    />
  );
  const OkButton = <DialogButton onClick={onOk} variant="ok" />;
  const OkAndNextButton = (
    <DialogButton
      onClick={handleNextItem}
      variant="next-and-ok"
      disabled={
        currentTab !== Tabs.Reason ||
        (isDisabled && !hasNextItem) ||
        (modalMode === ModalMode.Update && !hasNextItem)
      }
    />
  );

  return (
    <Modal
      title={t('heading.return-items')}
      cancelButton={currentTab === Tabs.Quantity ? CancelButton : BackButton}
      // zeroQuantityAlert === warning implies all lines are 0 and user has
      // been already warned, so we act immediately to update them
      okButton={
        currentTab === Tabs.Quantity && zeroQuantityAlert !== 'warning'
          ? NextStepButton
          : OkButton
      }
      nextButton={!isNewReturn ? OkAndNextButton : undefined}
      height={700}
      width={1200}
    >
      <Box ref={alertRef}>
        {returnId && (
          <ItemSelector
            disabled={!!itemId}
            itemId={itemId}
            onChangeItemId={setItemId}
          />
        )}
        {lines.length > 0 && (
          <ReturnSteps
            currentTab={currentTab}
            lines={lines}
            update={update}
            zeroQuantityAlert={zeroQuantityAlert}
            setZeroQuantityAlert={setZeroQuantityAlert}
            packSizeAlert={packSizeAlert}
            setPackSizeAlert={setPackSizeAlert}
            theirReference={theirReference}
            onTheirReferenceChange={setTheirReference}
            isDisabled={isDisabled}
            returnToStoreName={outboundShipment?.otherPartyName}
            // We only allow adding draft lines when we are adding by item
            addDraftLine={itemId ? addDraftLine : undefined}
          />
        )}
      </Box>
    </Modal>
  );
};
