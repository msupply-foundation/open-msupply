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
  onChange: (input: Partial<PurchaseOrderFragment>) => void;
}

export const Details = ({ draft, onChange }: DetailsProps): ReactElement => {
  const t = useTranslation();

  if (!draft)
    return <NothingHere body={t('messages.no-purchase-order-details')} />;

  const chargeFields = [
    { key: 'agentCommission', label: t('label.agent-commission') },
    { key: 'documentCharge', label: t('label.document-charge') },
    {
      key: 'communicationsCharge',
      label: t('label.communication-charge'),
    },
    { key: 'insuranceCharge', label: t('label.insurance-charge') },
    { key: 'freightCharge', label: t('label.freight-charge') },
  ];

  return (
    <DetailContainer>
      <Box
        sx={{
          width: '100%',
          p: 4,
        }}
      >
        <Stack direction="row" spacing={3}>
          <Stack
            spacing={3}
            sx={{
              flex: 1,
              p: 2.5,
            }}
          >
            <InputWithLabelRow
              label={t('label.authorising-officer-1')}
              labelWidth={'160px'}
              Input={
                <BasicTextInput
                  value={draft.authorisingOfficer1 ?? ''}
                  onChange={event => {
                    onChange({
                      authorisingOfficer1: event.target.value,
                    });
                  }}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.authorising-officer-2')}
              labelWidth={'160px'}
              Input={
                <BasicTextInput
                  value={draft.authorisingOfficer2 ?? ''}
                  onChange={event =>
                    onChange({
                      authorisingOfficer2: event.target.value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.additional-instructions')}
              labelWidth={'160px'}
              Input={
                <TextArea
                  value={draft.additionalInstructions ?? ''}
                  onChange={event =>
                    onChange({
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
              p: 2.5,
            }}
          >
            <InputWithLabelRow
              label={t('label.supplier-agent')}
              labelWidth={'140px'}
              Input={
                <BasicTextInput
                  value={draft?.supplierAgent ?? ''}
                  onChange={event =>
                    onChange({
                      supplierAgent: event.target.value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.heading-message')}
              labelWidth={'140px'}
              Input={
                <BasicTextInput
                  value={draft?.headingMessage ?? ''}
                  onChange={event =>
                    onChange({
                      headingMessage: event.target.value,
                    })
                  }
                />
              }
            />
            <InputWithLabelRow
              label={t('label.freight-condition')}
              labelWidth={'140px'}
              Input={
                <TextArea
                  value={draft.freightConditions ?? ''}
                  onChange={event =>
                    onChange({
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
            spacing={2.5}
            sx={{
              flex: 1,
              p: 2.5,
            }}
          >
            {chargeFields.map(({ key, label }) => (
              <InputWithLabelRow
                key={key}
                label={label}
                labelWidth={'150px'}
                Input={
                  <CurrencyInput
                    value={
                      (draft?.[key as keyof PurchaseOrderFragment] as number) ??
                      0
                    }
                    onChangeNumber={value =>
                      onChange({
                        [key]: value,
                      } as Partial<PurchaseOrderFragment>)
                    }
                  />
                }
              />
            ))}
          </Stack>
        </Stack>
      </Box>
    </DetailContainer>
  );
};
