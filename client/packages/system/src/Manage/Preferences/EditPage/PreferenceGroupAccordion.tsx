import {
  Divider,
  InputWithLabelRow,
  Typography,
  UpsertPreferencesInput,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';
import { AdminPreferenceFragment } from '../api/operations.generated';
import { EditPreference } from './EditPreference';
import { isAnyAmcPrefOn, generateAmcFormula } from './utils';
import { PreferenceAccordion } from './PreferenceAccordion';

interface PreferenceGroupAccordionProps {
  label: string;
  preferences: AdminPreferenceFragment[];
  update: (input: Partial<UpsertPreferencesInput>) => Promise<boolean>;
}

export const PreferenceGroupAccordion = ({
  label,
  preferences,
  update,
}: PreferenceGroupAccordionProps) => {
  const t = useTranslation();

  const showAmcFormula = isAnyAmcPrefOn(preferences);
  const amcFormula = generateAmcFormula(preferences, t);

  return (
    <PreferenceAccordion label={label}>
      {preferences.map((pref, idx) => {
        const isLast = idx === preferences.length - 1;
        return (
          <EditPreference
            key={pref.key}
            preference={pref}
            update={value => update({ [pref.key]: value })}
            isLast={isLast}
          />
        );
      })}
      {showAmcFormula && (
        <>
          <Divider />
          <InputWithLabelRow
            label={t('label.amc-calculation')}
            sx={{
              display: 'flex',
              alignItems: 'start',
              flexDirection: 'column',
              padding: 1,
            }}
            labelProps={{
              sx: { display: 'flex', textAlign: 'start' },
            }}
            Input={
              <Typography variant="caption" color="text.secondary">
                {amcFormula}
              </Typography>
            }
          />
        </>
      )}
    </PreferenceAccordion>
  );
};
