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
  UserIcon,
  LocaleKey,
  TypedTFunction,
  Option,
  ContactTraceNodeStatus,
} from '@openmsupply-client/common';
import { ContactTraceRowFragment } from '@openmsupply-client/programs';

import { Select } from '@common/components';
import { traceStatusTranslation } from './Footer';

const traceStatusOption = (
  status: ContactTraceNodeStatus,
  t: TypedTFunction<LocaleKey>
): Option => {
  return {
    label: traceStatusTranslation(status, t),
    value: status,
  };
};

const Row = ({ label, Input }: { label: string; Input: ReactNode }) => (
  <InputWithLabelRow labelWidth="90px" label={label} Input={Input} />
);
interface ToolbarProps {
  onChange: (patch: Partial<ContactTraceRowFragment>) => void;
  trace: ContactTraceRowFragment;
}
export const Toolbar: FC<ToolbarProps> = ({ trace, onChange }) => {
  const [status, setStatus] = useState<ContactTraceNodeStatus | undefined>(
    trace.status ?? undefined
  );
  const [datetime, setDatetime] = useState<string | undefined>();
  const t = useTranslation('dispensary');

  useEffect(() => {
    setStatus(trace.status ?? undefined);
    setDatetime(trace.datetime);
  }, [trace.status, trace.datetime]);

  const { patient } = trace;

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
            <Box display="flex" gap={1.5}>
              <Row
                label={t('label.patient')}
                Input={<BasicTextInput disabled value={patient.name} />}
              />
            </Box>
            <Box display="flex" gap={1.5}>
              <Row
                label={t('label.program')}
                Input={
                  <BasicTextInput disabled value={trace.program.name ?? ''} />
                }
              />
              <Row
                label={t('label.contact-trace-status')}
                Input={
                  <Select
                    fullWidth
                    onChange={event => {
                      const newStatus = event.target
                        .value as ContactTraceNodeStatus;
                      setStatus(newStatus);
                      onChange({
                        status: newStatus,
                      });
                    }}
                    options={[
                      traceStatusOption(ContactTraceNodeStatus.Pending, t),
                      traceStatusOption(ContactTraceNodeStatus.Done, t),
                    ]}
                    value={status}
                  />
                }
              />
            </Box>
            <Box display="flex" gap={1}>
              <Row
                label={t('label.visit-date')}
                Input={
                  <DatePickerInput
                    value={DateUtils.getDateOrNull(datetime ?? null)}
                    onChange={date => {
                      const datetime = DateUtils.formatRFC3339(date);
                      setDatetime(datetime);
                      onChange({
                        datetime,
                      });
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
