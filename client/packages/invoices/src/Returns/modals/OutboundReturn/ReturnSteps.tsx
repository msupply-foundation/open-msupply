import React from 'react';
import {
  useTranslation,
  WizardStepper,
  TabPanel,
  TabContext,
  OutboundReturnLineNode,
  RecordPatch,
  Alert,
  AlertColor,
} from '@openmsupply-client/common';
import { QuantityToReturnTable } from './ReturnQuantitiesTable';
import { ReturnReasonsTable } from '../ReturnReasonsTable';

export enum Tabs {
  Quantity = 'Quantity',
  Reason = 'Reason',
}

interface ReturnStepsProps {
  currentTab: string;
  lines: OutboundReturnLineNode[];
  update: (patch: RecordPatch<OutboundReturnLineNode>) => void;
  zeroQuantityAlert: AlertColor | undefined;
  setZeroQuantityAlert: React.Dispatch<
    React.SetStateAction<AlertColor | undefined>
  >;
}

export const ReturnSteps = ({
  currentTab,
  lines,
  update,
  zeroQuantityAlert,
  setZeroQuantityAlert,
}: ReturnStepsProps) => {
  const t = useTranslation('replenishment');

  const returnsSteps = [
    { tab: Tabs.Quantity, label: t('label.select-quantity'), description: '' },
    { tab: Tabs.Reason, label: t('label.reason'), description: '' },
  ];

  const getActiveStep = () => {
    const step = returnsSteps.findIndex(step => step.tab === currentTab);
    return step === -1 ? 0 : step;
  };

  const alertMessage =
    zeroQuantityAlert === 'warning'
      ? t('messages.warn-zero-return-quantity')
      : t('messages.alert-zero-return-quantity');

  return (
    <TabContext value={currentTab}>
      <WizardStepper activeStep={getActiveStep()} steps={returnsSteps} />
      <TabPanel value={Tabs.Quantity}>
        {zeroQuantityAlert && (
          <Alert severity={zeroQuantityAlert}>{alertMessage}</Alert>
        )}
        <QuantityToReturnTable
          lines={lines}
          updateLine={line => {
            if (zeroQuantityAlert) setZeroQuantityAlert(undefined);
            update(line);
          }}
        />
      </TabPanel>
      <TabPanel value={Tabs.Reason}>
        <ReturnReasonsTable
          lines={lines.filter(l => l.numberOfPacksToReturn > 0)}
          updateLine={line => update(line)}
        />
      </TabPanel>
    </TabContext>
  );
};
