import React from 'react';
import {
  useTranslation,
  WizardStepper,
  TabPanel,
  TabContext,
  RecordPatch,
  Alert,
  AlertColor,
  Box,
  BasicTextInput,
  InputWithLabelRow,
  Typography,
} from '@openmsupply-client/common';
import { QuantityToReturnTable } from './ReturnQuantitiesTable';
import { ReturnReasonsTable } from '../ReturnReasonsTable';
import { GenerateSupplierReturnLineFragment, useReturns } from '../../api';

export enum Tabs {
  Quantity = 'Quantity',
  Reason = 'Reason',
}

interface ReturnStepsProps {
  currentTab: string;
  lines: GenerateSupplierReturnLineFragment[];
  update: (patch: RecordPatch<GenerateSupplierReturnLineFragment>) => void;
  zeroQuantityAlert: AlertColor | undefined;
  setZeroQuantityAlert: React.Dispatch<
    React.SetStateAction<AlertColor | undefined>
  >;
  theirReference: string;
  onTheirReferenceChange: (value: string) => void;
  isDisabled: boolean;
  returnToName?: string;
  returnId?: string;
}

export const ReturnSteps = ({
  currentTab,
  lines,
  update,
  zeroQuantityAlert,
  setZeroQuantityAlert,
  theirReference,
  onTheirReferenceChange,
  isDisabled,
  returnToName,
  returnId,
}: ReturnStepsProps) => {
  const t = useTranslation();
  const { data } = useReturns.document.supplierReturn();

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
      ? t('messages.zero-return-quantity-will-delete-lines')
      : t('messages.alert-zero-return-quantity');

  const inputsDisabled = !!returnId && isDisabled;

  return (
    <TabContext value={currentTab}>
      <WizardStepper activeStep={getActiveStep()} steps={returnsSteps} />
      <Box
        sx={{
          display: 'flex',
          gap: 8,
          py: 2,
          px: 2,
        }}
      >
        <InputWithLabelRow
          label={t('label.return-to')}
          Input={
            <Typography>
              {returnToName ?? data?.otherPartyName ?? ''}
            </Typography>
          }
        />
        <InputWithLabelRow
          label={t('label.supplier-ref')}
          labelWidth={null}
          labelProps={{ sx: { whiteSpace: 'nowrap' } }}
          Input={
            <BasicTextInput
              disabled={isDisabled}
              value={theirReference}
              onChange={e => onTheirReferenceChange(e.target.value)}
            />
          }
        />
      </Box>
      <TabPanel value={Tabs.Quantity}>
        {zeroQuantityAlert && (
          <Alert severity={zeroQuantityAlert}>{alertMessage}</Alert>
        )}
        <QuantityToReturnTable
          isDisabled={inputsDisabled}
          lines={lines}
          updateLine={line => {
            if (zeroQuantityAlert) setZeroQuantityAlert(undefined);
            update(line);
          }}
        />
      </TabPanel>
      <TabPanel value={Tabs.Reason}>
        <ReturnReasonsTable
          isDisabled={inputsDisabled}
          lines={lines.filter(l => l.numberOfPacksToReturn > 0)}
          updateLine={line => update(line)}
          disabledLinked={false}
        />
      </TabPanel>
    </TabContext>
  );
};
