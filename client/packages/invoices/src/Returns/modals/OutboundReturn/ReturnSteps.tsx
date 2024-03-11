import React from 'react';
import {
  useTranslation,
  WizardStepper,
  TabPanel,
  TabContext,
  OutboundReturnLineNode,
  RecordPatch,
  Alert,
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
  showZeroQuantityAlert: boolean;
  setShowZeroQuantityAlert: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ReturnSteps = ({
  currentTab,
  lines,
  update,
  showZeroQuantityAlert,
  setShowZeroQuantityAlert,
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

  return (
    <TabContext value={currentTab}>
      <WizardStepper activeStep={getActiveStep()} steps={returnsSteps} />
      <TabPanel value={Tabs.Quantity}>
        {showZeroQuantityAlert && (
          <Alert severity="error">
            {t('messages.alert-zero-return-quantity')}
          </Alert>
        )}
        <QuantityToReturnTable
          lines={lines}
          updateLine={line => {
            if (showZeroQuantityAlert) setShowZeroQuantityAlert(false);
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
