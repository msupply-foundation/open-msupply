import React from 'react';
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
} from '@openmsupply-client/common';
import { QuantityReturnedTable } from './ReturnQuantitiesTable';
import { useDraftInboundReturnLines } from './useDraftInboundReturnLines';
import { ReturnReasonsTable } from '../ReturnReasonsTable';

interface InboundReturnEditModalProps {
  isOpen: boolean;
  outboundShipmentLineIds: string[];
  customerId: string;
  onClose: () => void;
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
}: InboundReturnEditModalProps) => {
  const t = useTranslation('distribution');
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);

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

  const { lines, update, saveInboundReturn } = useDraftInboundReturnLines(
    outboundShipmentLineIds,
    customerId
  );

  const onOk = async () => {
    try {
      await saveInboundReturn();
      onClose();
    } catch {
      // TODO: handle error display...
    }
  };

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
        nextButton={
          currentTab === Tabs.Quantity ? (
            <DialogButton
              onClick={() => onChangeTab(Tabs.Reason)}
              variant="next"
            />
          ) : undefined
        }
        okButton={
          currentTab === Tabs.Reason ? (
            <DialogButton onClick={onOk} variant="ok" />
          ) : undefined
        }
        height={height}
        width={1024}
      >
        <>
          <WizardStepper activeStep={getActiveStep()} steps={returnsSteps} />
          <TabContext value={currentTab}>
            <TabPanel value={Tabs.Quantity}>
              <QuantityReturnedTable
                lines={lines}
                updateLine={line => {
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
        </>
      </Modal>
    </TableProvider>
  );
};
