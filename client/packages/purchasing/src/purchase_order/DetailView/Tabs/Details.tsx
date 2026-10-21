import React, { ReactElement } from 'react';
import {
  DetailContainer,
  Box,
  InputWithLabelRow,
  useTranslation,
  BasicTextInput,
  TextArea,
  Stack,
  NothingHere,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';

interface DetailsProps {
  draft?: PurchaseOrderFragment;
  onChange: (input: Partial<PurchaseOrderFragment>) => void;
  disabled?: boolean;
}

export const Details = ({ draft, onChange, disabled }: DetailsProps): ReactElement => {
  const t = useTranslation();

  if (!draft)
    return <NothingHere body={t('messages.no-purchase-order-details')} />;

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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
        </Stack>
      </Box>
    </DetailContainer>
  );
};
