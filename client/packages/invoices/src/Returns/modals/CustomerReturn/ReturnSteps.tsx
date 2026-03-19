import React from 'react';
import {
  useTranslation,
  WizardStepper,
  TabPanel,
  TabContext,
  AlertColor,
  Alert,
  RecordPatch,
  Box,
  BasicTextInput,
  InputWithLabelRow,
  Typography,
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
  packSizeAlert: boolean;
  setPackSizeAlert: React.Dispatch<React.SetStateAction<boolean>>;
  theirReference: string;
  onTheirReferenceChange: (value: string) => void;
  isDisabled: boolean;
  returnToStoreName?: string;
}

export const ReturnSteps = ({
  currentTab,
  lines,
  update,
  addDraftLine,
  zeroQuantityAlert,
  setZeroQuantityAlert,
  packSizeAlert,
  setPackSizeAlert,
  theirReference,
  onTheirReferenceChange,
  isDisabled,
  returnToStoreName,
}: ReturnStepsProps) => {
  const t = useTranslation();
  const { data } = useReturns.document.customerReturn();
  const disabledLinked = !!data?.linkedShipment || isDisabled;

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
      ? t('messages.zero-return-quantity-will-delete-lines')
      : t('messages.alert-zero-return-quantity');

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
              {returnToStoreName ?? data?.otherPartyName ?? ''}
            </Typography>
          }
        />
        <InputWithLabelRow
          label={t('label.customer-ref')}
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
      {addDraftLine && (
        <AddBatchButton
          addDraftLine={addDraftLine}
          disabled={currentTab !== Tabs.Quantity || disabledLinked}
        />
      )}
      <TabPanel value={Tabs.Quantity}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {packSizeAlert && (
            <Alert severity="error">
              {t('messages.alert-invalid-pack-size')}
            </Alert>
          )}
          {zeroQuantityAlert && (
            <Alert severity={zeroQuantityAlert}>{alertMessage}</Alert>
          )}
        </Box>
        <QuantityReturnedTable
          lines={lines}
          isDisabled={disabledLinked}
          updateLine={line => {
            if (
              packSizeAlert &&
              'packSize' in line &&
              (line.packSize ?? 0) >= 1
            )
              setPackSizeAlert(false);
            if (zeroQuantityAlert) setZeroQuantityAlert(undefined);
            update(line);
          }}
        />
      </TabPanel>
      <TabPanel value={Tabs.Reason}>
        <ReturnReasonsTable
          isDisabled={isDisabled}
          disabledLinked={disabledLinked}
          lines={lines.filter(line => line.numberOfPacksReturned > 0)}
          updateLine={line => update(line)}
        />
      </TabPanel>
    </TabContext>
  );
};
