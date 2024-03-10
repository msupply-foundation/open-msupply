import React from 'react';
import {
  useTranslation,
  WizardStepper,
  TabPanel,
  TabContext,
  OutboundReturnLineNode,
  RecordPatch,
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
}

export const ReturnSteps = ({
  currentTab,
  lines,
  update,
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
        <QuantityToReturnTable
          lines={lines}
          updateLine={line => update(line)}
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
