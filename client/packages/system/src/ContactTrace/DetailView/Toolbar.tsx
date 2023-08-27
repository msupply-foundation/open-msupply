import React, { FC, ReactNode } from 'react';
import { Box, Grid } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { UserIcon } from '@common/icons';
import {
  AppBarContentPortal,
  BasicTextInput,
  InputWithLabelRow,
} from '@common/components';
import { ContactTrace, ContactTraceData } from './useContactTraceData';

const Row = ({ label, Input }: { label: string; Input: ReactNode }) => (
  <InputWithLabelRow labelWidth="90px" label={label} Input={Input} />
);
interface ToolbarProps {
  onChange: (patch: Partial<ContactTrace>) => void;
  data: ContactTraceData;
}
export const Toolbar: FC<ToolbarProps> = ({ data }) => {
  const t = useTranslation('dispensary');

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
            </Box>
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
