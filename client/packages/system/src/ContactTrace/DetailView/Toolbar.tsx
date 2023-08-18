import React, { FC, ReactNode, useEffect, useState } from 'react';
import { Box, Grid } from '@openmsupply-client/common';
import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
} from '@common/intl';
import { UserIcon } from '@common/icons';
import { ContactTraceNodeStatus } from '@common/types';
import {
  AppBarContentPortal,
  BasicTextInput,
  DatePickerInput,
  InputWithLabelRow,
  Option,
  Select,
} from '@common/components';
import { traceStatusTranslation } from './utils';
import { ContactTrace, ContactTraceData } from './DetailView';

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
  onChange: (patch: Partial<ContactTrace>) => void;
  data: ContactTraceData;
}
export const Toolbar: FC<ToolbarProps> = ({ data, onChange }) => {
  const [status, setStatus] = useState<ContactTraceNodeStatus | undefined>(
    data.contactTrace.status ?? undefined
  );
  const [datetime, setDatetime] = useState<string | undefined>();
  const t = useTranslation('dispensary');

  useEffect(() => {
    setStatus(data.contactTrace.status ?? undefined);
    setDatetime(data.contactTrace.datetime);
  }, [data.contactTrace.status, data.contactTrace.datetime]);

  const { patient } = data;

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
                  <BasicTextInput disabled value={data.programName ?? ''} />
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
