import React from 'react';
import {
  BasicTextInput,
  GenderInput,
  InputWithLabelRow,
  Stack,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftClinician } from '.';

interface CreateClinicianFormProps {
  draft: DraftClinician;
  updateDraft: (update: Partial<DraftClinician>) => void;
  width?: number | string;
}

export const CreateClinicianForm = ({
  draft,
  updateDraft,
  width = 325,
}: CreateClinicianFormProps) => {
  const t = useTranslation();

  return (
    <Stack gap={2} padding="16px">
      <InputWithLabelRow
        label={t('label.code')}
        Input={
          <BasicTextInput
            sx={{ width }}
            value={draft.code}
            onChange={event => {
              updateDraft({ code: event.target.value.toUpperCase() });
            }}
            autoFocus
            required
          />
        }
      />
      <InputWithLabelRow
        label={t('label.first-name')}
        Input={
          <BasicTextInput
            sx={{ width }}
            value={draft.firstName}
            onChange={event => {
              updateDraft({ firstName: event.target.value });
            }}
          />
        }
      />
      <InputWithLabelRow
        label={t('label.last-name')}
        Input={
          <BasicTextInput
            sx={{ width }}
            value={draft.lastName}
            onChange={event => {
              updateDraft({ lastName: event.target.value });
            }}
            required
          />
        }
      />
      <InputWithLabelRow
        label={t('label.initials')}
        Input={
          <BasicTextInput
            sx={{ width }}
            value={draft.initials}
            onChange={event => {
              updateDraft({ initials: event.target.value });
            }}
            required
          />
        }
      />
      <InputWithLabelRow
        label={t('label.mobile')}
        Input={
          <BasicTextInput
            sx={{ width }}
            value={draft.mobile}
            onChange={event => {
              const numericValue = event.target.value.replace(/[^0-9]/g, '');
              updateDraft({ mobile: numericValue });
            }}
          />
        }
      />
      <InputWithLabelRow
        label={t('label.gender')}
        Input={
          <GenderInput
            value={draft.gender}
            onChange={value => updateDraft({ gender: value })}
            width={width}
          />
        }
      />
    </Stack>
  );
};
