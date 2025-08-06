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
  NothingHere,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';

interface DetailsProps {
  draft?: PurchaseOrderFragment;
  onDraftChange: (input: Partial<PurchaseOrderFragment>) => void;
  onDebounceUpdate: (input: Partial<PurchaseOrderFragment>) => void;
}

export const Details = ({
  draft,
  onDraftChange,
  onDebounceUpdate,
}: DetailsProps): ReactElement => {
  const t = useTranslation();

  const handleFieldChange = (input: Partial<PurchaseOrderFragment>) => {
    onDraftChange(input);
    onDebounceUpdate(input);
  };

  if (!draft)
    return <NothingHere body={t('messages.no-purchase-order-details')} />;

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
              Input={
                <BasicTextInput
                  value={draft.authorisingOfficer1 ?? ''}
                  onChange={event => {
                    handleFieldChange({
                      authorisingOfficer1: event.target.value,
                    });
                  }}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.authorising-officer-2')}
              labelWidth={'150px'}
              Input={
                <BasicTextInput
                  value={draft.authorisingOfficer2 ?? ''}
                  onChange={event =>
                    handleFieldChange({
                      authorisingOfficer2: event.target.value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.additional-instructions')}
              labelWidth={'150px'}
              Input={
                <TextArea
                  value={draft.additionalInstructions ?? ''}
                  onChange={event =>
                    handleFieldChange({
                      additionalInstructions: event.target.value,
                    })
                  }
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
              Input={
                <BasicTextInput
                  value={draft?.supplierAgent ?? ''}
                  onChange={event =>
                    handleFieldChange({
                      supplierAgent: event.target.value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.heading-message')}
              Input={
                <BasicTextInput
                  value={draft?.headingMessage ?? ''}
                  onChange={event =>
                    handleFieldChange({
                      headingMessage: event.target.value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.freight-condition')}
              Input={
                <TextArea
                  value={draft.freightConditions ?? ''}
                  onChange={event =>
                    handleFieldChange({
                      freightConditions: event.target.value,
                    })
                  }
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
                  value={draft?.agentCommission ?? 0}
                  onChangeNumber={value =>
                    handleFieldChange({
                      agentCommission: value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.document-charge')}
              Input={
                <CurrencyInput
                  value={draft?.documentCharge ?? 0}
                  onChangeNumber={value =>
                    handleFieldChange({
                      documentCharge: value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.communication-charge')}
              Input={
                <CurrencyInput
                  value={draft?.communicationsCharge ?? 0}
                  onChangeNumber={value =>
                    handleFieldChange({
                      communicationsCharge: value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.insurance-charge')}
              Input={
                <CurrencyInput
                  value={draft?.insuranceCharge ?? 0}
                  onChangeNumber={value =>
                    handleFieldChange({
                      insuranceCharge: value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.freight-charge')}
              Input={
                <CurrencyInput
                  value={draft?.freightCharge ?? 0}
                  onChangeNumber={value =>
                    handleFieldChange({
                      freightCharge: value,
                    })
                  }
                />
              }
            />
          </Stack>
        </Stack>
      </Box>
    </DetailContainer>
  );
};
