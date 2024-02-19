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
import { QuantityToReturnTable } from './ReturnQuantitiesTable';
import { useDraftSupplierReturnLines } from './useDraftSupplierReturnLines';
import { ReturnReasonsTable } from '../ReturnReasonsTable';

interface SupplierReturnLinesModalProps {
  isOpen: boolean;
  stockLineIds: string[];
  onClose: () => void;
  supplierId: string;
}

enum Tabs {
  Quantity = 'Quantity',
  Reason = 'Reason',
}

export const SupplierReturnLinesModal = ({
  isOpen,
  stockLineIds,
  onClose,
  supplierId,
}: SupplierReturnLinesModalProps) => {
  const t = useTranslation('replenishment');
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);

  const returnsSteps = [
    { tab: Tabs.Quantity, label: t('label.select-quantity'), description: '' },
    { tab: Tabs.Reason, label: t('label.reason'), description: '' },
  ];

  const getActiveStep = () => {
    const step = returnsSteps.findIndex(step => step.tab === currentTab);
    return step === -1 ? 0 : step;
  };

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  const { lines, update, saveSupplierReturn } = useDraftSupplierReturnLines(
    stockLineIds,
    supplierId
  );

  const onOk = async () => {
    try {
      await saveSupplierReturn();
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
              <QuantityToReturnTable
                lines={lines}
                updateLine={line => update(line)}
              />
            </TabPanel>
            <TabPanel value={Tabs.Reason}>
              <ReturnReasonsTable
                lines={lines}
                updateLine={line => update(line)}
              />
            </TabPanel>
          </TabContext>
        </>
      </Modal>
    </TableProvider>
  );
};
