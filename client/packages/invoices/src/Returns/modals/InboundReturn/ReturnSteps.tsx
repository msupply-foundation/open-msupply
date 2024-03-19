import React, { useEffect } from 'react';
import {
  useTranslation,
  WizardStepper,
  TabPanel,
  TabContext,
  AlertColor,
  Alert,
  RecordPatch,
  GeneratedInboundReturnLineNode,
  ButtonWithIcon,
  PlusCircleIcon,
  Box,
} from '@openmsupply-client/common';
import { QuantityReturnedTable } from './ReturnQuantitiesTable';
import { ReturnReasonsTable } from '../ReturnReasonsTable';
import { useReturns } from '../..';

export enum Tabs {
  Quantity = 'Quantity',
  Reason = 'Reason',
}

interface ReturnStepsProps {
  currentTab: string;
  lines: GeneratedInboundReturnLineNode[];
  update: (patch: RecordPatch<GeneratedInboundReturnLineNode>) => void;
  addDraftLine?: () => void;
  zeroQuantityAlert: AlertColor | undefined;
  setZeroQuantityAlert: React.Dispatch<
    React.SetStateAction<AlertColor | undefined>
  >;
}

export const ReturnSteps = ({
  currentTab,
  lines,
  update,
  addDraftLine,
  zeroQuantityAlert,
  setZeroQuantityAlert,
}: ReturnStepsProps) => {
  const t = useTranslation(['distribution', 'replenishment']);
  const isDisabled = useReturns.utils.inboundIsDisabled();

  useAddDraftLineKeyBinding(addDraftLine);

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

  return (
    <TabContext value={currentTab}>
      <WizardStepper activeStep={getActiveStep()} steps={returnsSteps} />
      {addDraftLine && (
        <Box flex={1} justifyContent="flex-end" display="flex">
          <ButtonWithIcon
            disabled={isDisabled}
            color="primary"
            variant="outlined"
            onClick={addDraftLine}
            label={`${t('label.add-batch')} (+)`}
            Icon={<PlusCircleIcon />}
          />
        </Box>
      )}
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
  );
};

const useAddDraftLineKeyBinding = (addDraftLine: (() => void) | undefined) => {
  useEffect(() => {
    const keyBinding = (e: KeyboardEvent) => {
      if (addDraftLine && e.key === '+') {
        e.preventDefault();
        addDraftLine();
      }
    };

    window.addEventListener('keydown', keyBinding);
    return () => window.removeEventListener('keydown', keyBinding);
  }, [addDraftLine]);
};
