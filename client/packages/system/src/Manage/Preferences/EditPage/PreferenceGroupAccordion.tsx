import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  ExpandIcon,
  InputWithLabelRow,
  LocaleKey,
  UpsertPreferencesInput,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';
import { AdminPreferenceFragment } from '../api/operations.generated';
import { EditPreference } from './EditPreference';

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

  return (
    <Accordion
      sx={{
        marginTop: 1,
        border: '1px solid',
        borderColor: 'grey.400',
        borderRadius: 1,
        boxShadow: 'none',
      }}
    >
      <AccordionSummary expandIcon={<ExpandIcon />} sx={{ fontWeight: 'bold' }}>
        {label}
      </AccordionSummary>
      <AccordionDetails>
        {preferences.map(pref => (
          <InputWithLabelRow
            key={pref.key}
            labelWidth={'100%'}
            label={t(`preference.${pref.key}` as LocaleKey)}
            Input={
              <EditPreference
                preference={pref}
                update={value => update({ [pref.key]: value })}
              />
            }
            sx={{
              justifyContent: 'center',
              borderBottom: '1px dashed',
              padding: 1,
            }}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
};
