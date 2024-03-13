import React, { useRef, useState } from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  TableProvider,
  createTableStore,
  useKeyboardHeightAdjustment,
  WizardStepper,
  useTabs,
  TabPanel,
  TabContext,
  ModalMode,
  Box,
  AlertColor,
  Alert,
} from '@openmsupply-client/common';
import { QuantityReturnedTable } from './ReturnQuantitiesTable';
import { useDraftInboundReturnLines } from './useDraftInboundReturnLines';
import { ReturnReasonsTable } from '../ReturnReasonsTable';

interface InboundReturnEditModalProps {
  isOpen: boolean;
  outboundShipmentLineIds: string[];
  customerId: string;
  onClose: () => void;
  modalMode: ModalMode | null;
  returnId?: string;
}

enum Tabs {
  Quantity = 'Quantity',
  Reason = 'Reason',
}

export const InboundReturnEditModal = ({
  isOpen,
  outboundShipmentLineIds,
  customerId,
  onClose,
  modalMode,
  returnId,
}: InboundReturnEditModalProps) => {
  const t = useTranslation(['distribution', 'replenishment']);
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);

  const alertRef = useRef<HTMLDivElement>(null);

  const [zeroQuantityAlert, setZeroQuantityAlert] = useState<
    AlertColor | undefined
  >();

  const returnsSteps = [
    { tab: Tabs.Quantity, label: t('label.quantity'), description: '' },
    { tab: Tabs.Reason, label: t('label.reason'), description: '' },
  ];

  const getActiveStep = () => {
    const step = returnsSteps.findIndex(step => step.tab === currentTab);
    return step === -1 ? 0 : step;
  };

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  const { lines, update, saveInboundReturn } = useDraftInboundReturnLines({
    outboundShipmentLineIds,
    customerId,
    returnId,
  });

  const onOk = async () => {
    try {
      await saveInboundReturn();
      onClose();
    } catch {
      // TODO: handle error display...
    }
  };

  const handleNext = () => {
    if (lines.some(line => line.numberOfPacksReturned !== 0)) {
      onChangeTab(Tabs.Reason);
      return;
    }
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
    alertRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const alertMessage =
    zeroQuantityAlert === 'warning'
      ? t('messages.zero-return-quantity-will-delete-lines', {
          ns: 'replenishment',
        })
      : t('messages.alert-zero-return-quantity', {
          ns: 'replenishment',
        });

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
        // zeroQuantityAlert === warning implies all lines are 0 and user has
        // been already warned, so we act immediately to update them
        nextButton={
          currentTab === Tabs.Quantity && zeroQuantityAlert !== 'warning' ? (
            <DialogButton onClick={handleNext} variant={'next'} />
          ) : undefined
        }
        okButton={
          currentTab === Tabs.Reason || zeroQuantityAlert === 'warning' ? (
            <DialogButton onClick={onOk} variant="ok" />
          ) : undefined
        }
        height={height}
        width={1024}
      >
        <Box ref={alertRef}>
          <WizardStepper activeStep={getActiveStep()} steps={returnsSteps} />
          <TabContext value={currentTab}>
            <TabPanel value={Tabs.Quantity}>
              {zeroQuantityAlert && (
                <Alert severity={zeroQuantityAlert}>{alertMessage}</Alert>
              )}
              <QuantityReturnedTable
                lines={lines}
                updateLine={line => {
                  if (zeroQuantityAlert) setZeroQuantityAlert(undefined);
                  update(line);
                }}
              />
            </TabPanel>
            <TabPanel value={Tabs.Reason}>
              <ReturnReasonsTable
                lines={lines.filter(line => line.numberOfPacksReturned > 0)}
                updateLine={line => update(line)}
              />
            </TabPanel>
          </TabContext>
        </Box>
      </Modal>
    </TableProvider>
  );
};
