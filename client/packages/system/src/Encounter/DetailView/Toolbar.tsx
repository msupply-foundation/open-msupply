import React, { FC, ReactNode, useEffect, useState } from 'react';
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
  UserIcon,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { EncounterFragment } from '@openmsupply-client/programs';
import { getClinicianName } from '../../Patient/Encounter';

const Row = ({ label, Input }: { label: string; Input: ReactNode }) => (
  <InputWithLabelRow labelWidth="90px" label={label} Input={Input} />
);
interface ToolbarProps {
  onChange: (patch: Partial<EncounterFragment>) => void;
  encounter: EncounterFragment;
}
export const Toolbar: FC<ToolbarProps> = ({ encounter, onChange }) => {
  const [startDatetime, setStartDatetime] = useState<string | undefined>();
  const [endDatetime, setEndDatetime] = useState<string | undefined | null>();
  const t = useTranslation('patients');
  const { localisedDate } = useFormatDateTime();

  useEffect(() => {
    if (!encounter) return;

    setStartDatetime(encounter.startDatetime);
    setEndDatetime(encounter.endDatetime);
  }, [encounter]);

  if (!encounter) return null;
  const { patient } = encounter;

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="center"
      >
        <Grid
          item
          sx={{
            alignItems: 'center',
            backgroundColor: 'background.menu',
            borderRadius: '50%',
            display: 'flex',
            height: '100px',
            justifyContent: 'center',
            marginRight: 2,
            width: '100px',
          }}
        >
          <Box>
            <UserIcon fontSize="large" style={{ flex: 1 }} />
          </Box>
        </Grid>
        <Grid item display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={0.5}>
            <Box display="flex" gap={1}>
              <Row
                label={t('label.patient')}
                Input={
                  <BasicTextInput disabled value={encounter?.patient.name} />
                }
              />
              <Row
                label={t('label.date-of-birth')}
                Input={
                  <BasicTextInput
                    disabled
                    value={localisedDate(patient.dateOfBirth ?? '')}
                  />
                }
              />
            </Box>
            <Box display="flex" gap={1}>
              <Row
                label={t('label.program')}
                Input={<BasicTextInput disabled value={encounter?.program} />}
              />
              <Row
                label={t('label.clinician')}
                Input={
                  <BasicTextInput
                    disabled
                    value={getClinicianName(encounter?.document.data.clinician)}
                  />
                }
              />
            </Box>
            <Box display="flex" gap={1}>
              <Row
                label={t('label.visit-date')}
                Input={
                  <DatePickerInput
                    value={DateUtils.getDateOrNull(startDatetime ?? null)}
                    onChange={date => {
                      const startDatetime = date
                        ? DateUtils.formatRFC3339(date)
                        : undefined;
                      setStartDatetime(startDatetime ?? undefined);
                      onChange({
                        startDatetime: startDatetime ?? undefined,
                        endDatetime: endDatetime ?? undefined,
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
                    value={DateUtils.getDateOrNull(startDatetime ?? null)}
                    onChange={date => {
                      const startDatetime = date
                        ? DateUtils.formatRFC3339(date)
                        : undefined;
                      if (startDatetime) {
                        setStartDatetime(startDatetime);
                        onChange({
                          startDatetime,
                          endDatetime: endDatetime ?? undefined,
                        });
                      }
                    }}
                  />
                }
              />
              <InputWithLabelRow
                label={t('label.visit-end')}
                labelWidth="60px"
                Input={
                  <TimePickerInput
                    value={DateUtils.getDateOrNull(endDatetime ?? null)}
                    onChange={date => {
                      const endDatetime = date
                        ? DateUtils.formatRFC3339(date)
                        : undefined;
                      if (endDatetime) {
                        setEndDatetime(endDatetime);
                        onChange({ endDatetime });
                      }
                    }}
                  />
                }
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
