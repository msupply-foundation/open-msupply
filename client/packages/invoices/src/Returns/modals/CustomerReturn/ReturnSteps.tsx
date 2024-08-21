import React from 'react';
import {
  useTranslation,
  WizardStepper,
  TabPanel,
  TabContext,
  AlertColor,
  Alert,
  RecordPatch,
} from '@openmsupply-client/common';
import { QuantityReturnedTable } from './ReturnQuantitiesTable';
import { ReturnReasonsTable } from '../ReturnReasonsTable';
import { AddBatchButton, useAddBatchKeyBinding } from './AddBatch';
import { GenerateCustomerReturnLineFragment, useReturns } from '../../api';

export enum Tabs {
  Quantity = 'Quantity',
  Reason = 'Reason',
}

interface ReturnStepsProps {
  currentTab: string;
  lines: GenerateCustomerReturnLineFragment[];
  update: (patch: RecordPatch<GenerateCustomerReturnLineFragment>) => void;
  addDraftLine?: () => void;
  zeroQuantityAlert: AlertColor | undefined;
  setZeroQuantityAlert: React.Dispatch<
    React.SetStateAction<AlertColor | undefined>
  >;
  returnId?: string;
}

export const ReturnSteps = ({
  currentTab,
  lines,
  update,
  addDraftLine,
  zeroQuantityAlert,
  setZeroQuantityAlert,
  returnId,
}: ReturnStepsProps) => {
  const t = useTranslation(['distribution', 'replenishment']);
  const isDisabled = useReturns.utils.customerIsDisabled();

  useAddBatchKeyBinding(addDraftLine);

  const returnsSteps = [
    { tab: Tabs.Quantity, label: t('label.quantity'), description: '' },
    { tab: Tabs.Reason, label: t('label.reason'), description: '' },
  ];

  const getActiveStep = () => {
    const step = returnsSteps.findIndex(step => step.tab === currentTab);
    return step === -1 ? 0 : step;
  };

  const alertMessage =
    zeroQuantityAlert === 'warning'
      ? t('messages.zero-return-quantity-will-delete-lines', {
          ns: 'replenishment',
        })
      : t('messages.alert-zero-return-quantity', {
          ns: 'replenishment',
        });

  const inputsDisabled = !!returnId && isDisabled;

  return (
    <TabContext value={currentTab}>
      <WizardStepper activeStep={getActiveStep()} steps={returnsSteps} />
      {addDraftLine && (
        <AddBatchButton
          addDraftLine={addDraftLine}
          disabled={currentTab !== Tabs.Quantity}
        />
      )}
      <TabPanel value={Tabs.Quantity}>
        {zeroQuantityAlert && (
          <Alert severity={zeroQuantityAlert}>{alertMessage}</Alert>
        )}
        <QuantityReturnedTable
          lines={lines}
          isDisabled={inputsDisabled}
          updateLine={line => {
            if (zeroQuantityAlert) setZeroQuantityAlert(undefined);
            update(line);
          }}
        />
      </TabPanel>
      <TabPanel value={Tabs.Reason}>
        <ReturnReasonsTable
          isDisabled={inputsDisabled}
          lines={lines.filter(line => line.numberOfPacksReturned > 0)}
          updateLine={line => update(line)}
        />
      </TabPanel>
    </TabContext>
  );
};
