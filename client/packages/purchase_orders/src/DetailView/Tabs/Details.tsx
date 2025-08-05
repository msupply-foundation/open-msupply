import React, { ReactElement } from 'react';
import {
  DetailContainer,
  Box,
  InputWithLabelRow,
  useTranslation,
  BasicTextInput,
  TextArea,
  CurrencyInput,
  Stack,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';
import { UpdatePurchaseOrderInput } from '../../api/hooks/usePurchaseOrder';

interface DetailsProps {
  data: PurchaseOrderFragment;
  update: (input: UpdatePurchaseOrderInput) => void;
}

export const Details = ({ data }: DetailsProps): ReactElement => {
  const t = useTranslation();
  return (
    <DetailContainer>
      <Box sx={{ width: '100%' }}>
        <Stack direction="row" spacing={2} sx={{ height: '100%' }}>
          <Stack
            spacing={3}
            sx={{
              flex: 1,
              height: '100%',
              p: 2,
            }}
          >
            <InputWithLabelRow
              label={t('label.authorising-officer-1')}
              labelWidth={'150px'}
              Input={<BasicTextInput value={data.authorisingOfficer1} />}
            />
            <InputWithLabelRow
              label={t('label.authorising-officer-2')}
              labelWidth={'150px'}
              Input={<BasicTextInput value={data.authorisingOfficer2} />}
            />
            <InputWithLabelRow
              label={t('label.additional-instructions')}
              labelWidth={'150px'}
              Input={
                <TextArea
                  value={data.additionalInstructions}
                  slotProps={{
                    input: { sx: { backgroundColor: 'background.drawer' } },
                  }}
                />
              }
            />
          </Stack>
          <Stack
            spacing={3}
            sx={{
              flex: 1,
              height: '100%',
              p: 2,
            }}
          >
            <InputWithLabelRow
              label={t('label.supplier-agent')}
              Input={<BasicTextInput value={data?.supplierAgent} />}
            />
            <InputWithLabelRow
              label={t('label.heading-message')}
              Input={<BasicTextInput value={data?.headingMessage} />}
            />
            <InputWithLabelRow
              label={t('label.freight-condition')}
              Input={
                <TextArea
                  value={data.freightConditions}
                  slotProps={{
                    input: { sx: { backgroundColor: 'background.drawer' } },
                  }}
                />
              }
            />
          </Stack>
          <Stack
            spacing={3}
            sx={{
              flex: 1,
              height: '100%',
              p: 2,
            }}
          >
            <InputWithLabelRow
              label={t('label.agent-commission')}
              Input={
                <CurrencyInput
                  value={data?.agentCommission ?? 0}
                  onChangeNumber={() => {}}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.document-charge')}
              Input={
                <CurrencyInput
                  value={data?.documentCharge ?? 0}
                  onChangeNumber={() => {}}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.communication-charge')}
              Input={
                <CurrencyInput
                  value={data?.communicationsCharge ?? 0}
                  onChangeNumber={() => {}}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.insurance-charge')}
              Input={
                <CurrencyInput
                  value={data?.insuranceCharge ?? 0}
                  onChangeNumber={() => {}}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.freight-charge')}
              Input={
                <CurrencyInput
                  value={data?.freightCharge ?? 0}
                  onChangeNumber={() => {}}
                />
              }
            />
          </Stack>
        </Stack>
      </Box>
    </DetailContainer>
  );
};
