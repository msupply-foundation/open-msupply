import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
  ExpandIcon,
  InputWithLabelRow,
  LocaleKey,
  Typography,
  UpsertPreferencesInput,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';
import { AdminPreferenceFragment } from '../api/operations.generated';
import { EditPreference } from './EditPreference';
import { AMC_GROUP_LABEL } from './usePreferenceGrouping';

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

  const showAMC = label === t(AMC_GROUP_LABEL);

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
      <AccordionSummary
        expandIcon={<ExpandIcon />}
        sx={{ fontWeight: 'bold', fontSize: 16 }}
      >
        {label}
      </AccordionSummary>
      <AccordionDetails>
        {preferences.map((pref, idx) => {
          const isLast = idx === preferences.length - 1;
          return (
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
                borderBottom: isLast ? 'none' : '1px dashed',
                padding: 1,
              }}
            />
          );
        })}
        {showAMC && (
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
                  {
                    '(consumption - transfers) * daysInMonth / ((lookbackMonths * daysInMonth ) - daysOutOfStock)'
                  }
                </Typography>
              }
            />
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
