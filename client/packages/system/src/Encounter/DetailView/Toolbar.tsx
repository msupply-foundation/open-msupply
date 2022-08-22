import React, { FC, ReactNode } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  BasicTextInput,
  DatePickerInput,
  DateUtils,
  TimePickerInput,
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from '../api';

const Row = ({ label, Input }: { label: string; Input: ReactNode }) => (
  <InputWithLabelRow labelWidth="90px" label={label} Input={Input} />
);
interface ToolbarProps {
  onChange: (patch: Partial<EncounterFragment>) => void;
}
export const Toolbar: FC<ToolbarProps> = ({ onChange }) => {
  const { data } = useEncounter.document.get();
  const t = useTranslation('patients');

  if (!data) return null;

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid item display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={0.5}>
            <Row
              label={t('label.patient')}
              Input={<BasicTextInput disabled value={data?.patient.name} />}
            />
            <Box display="flex" gap={1}>
              <Row
                label={t('label.visit-date')}
                Input={
                  <DatePickerInput
                    value={DateUtils.getDateOrNull(data?.startDatetime)}
                    onChange={date => {
                      const startDatetime = date
                        ? DateUtils.formatRFC3339(date)
                        : undefined;
                      onChange({
                        startDatetime,
                        endDatetime: data?.endDatetime ?? undefined,
                      });
                    }}
                  />
                }
              />
              <InputWithLabelRow
                label={t('label.visit-start')}
                labelWidth="60px"
                Input={
                  <TimePickerInput
                    value={DateUtils.getDateOrNull(data?.startDatetime ?? null)}
                    onChange={date => {
                      const startDatetime = date
                        ? DateUtils.formatRFC3339(date)
                        : undefined;
                      onChange({
                        startDatetime,
                        endDatetime: data?.endDatetime ?? undefined,
                      });
                    }}
                  />
                }
              />
              <InputWithLabelRow
                label={t('label.visit-end')}
                labelWidth="60px"
                Input={
                  <TimePickerInput
                    value={DateUtils.getDateOrNull(data?.endDatetime ?? null)}
                    onChange={date => {
                      const endDatetime = date
                        ? DateUtils.formatRFC3339(date)
                        : undefined;
                      onChange({ endDatetime });
                    }}
                  />
                }
              />
            </Box>
            <Row
              label={t('label.program')}
              Input={<BasicTextInput disabled value={data?.program} />}
            />
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
