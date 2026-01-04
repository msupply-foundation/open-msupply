import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  ExpandIcon,
  InputWithLabelRow,
  Typography,
  UpsertPreferencesInput,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';
import { AdminPreferenceFragment } from '../api/operations.generated';
import { EditPreference } from './EditPreference';
import { isAnyAmcPrefOn } from './utils';

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
                <Typography variant="caption">
                  {t('messages.amc-calculation')}
                </Typography>
              }
            />
            <Divider />
            <Box padding={1}>
              <Typography variant="caption" color="text.secondary">
                {t('messages.amc-consumption')}
                <br />
                {t('messages.amc-lookback-months')}
                <br />
                {t('messages.amc-lookback-days')}
                <br />
                {t('messages.amc-days-out-of-stock')}
                <br />
                {t('messages.amc-days-out-of-stock-adjustment')}
                <br />
                {t('messages.amc-minus-transfers')}
              </Typography>
            </Box>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
