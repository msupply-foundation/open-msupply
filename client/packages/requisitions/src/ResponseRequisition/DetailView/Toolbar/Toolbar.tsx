import React from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  Typography,
  BufferedTextInput,
  Tooltip,
  BasicTextInput,
  usePreferences,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';

import { useResponse } from '../../api';
import { getApprovalStatusKey } from '../../../utils';

export const Toolbar = () => {
  const t = useTranslation();
  const isDisabled = useResponse.utils.isDisabled();

  const {
    approvalStatus,
    otherParty,
    theirReference,
    programName,
    destinationCustomer,
    update,
  } = useResponse.document.fields([
    'approvalStatus',
    'otherParty',
    'theirReference',
    'programName',
    'destinationCustomer',
  ]);
  const { selectDestinationStoreForAnInternalOrder } = usePreferences();
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
        gap={1}
      >
        <Grid display="flex" flex={1}>
          <Box display="flex" flexDirection="row" gap={4}>
            <Box display="flex" flex={1} flexDirection="column" gap={1}>
              {otherParty && (
                <InputWithLabelRow
                  label={t('label.customer-name')}
                  Input={
                    <CustomerSearchInput
                      disabled
                      value={otherParty}
                      onChange={newOtherParty => {
                        update({ otherParty: newOtherParty ?? undefined });
                      }}
                    />
                  }
                />
              )}
              <InputWithLabelRow
                label={t('label.customer-ref')}
                Input={
                  <Tooltip title={theirReference} placement="bottom-start">
                    <BufferedTextInput
                      disabled={isDisabled}
                      size="small"
                      sx={{ width: 250 }}
                      value={theirReference}
                      onChange={e => update({ theirReference: e.target.value })}
                    />
                  </Tooltip>
                }
              />
              {selectDestinationStoreForAnInternalOrder && (
                <InputWithLabelRow
                  label={t('label.destination-customer')}
                  Input={
                    <CustomerSearchInput
                      disabled
                      value={destinationCustomer ?? null}
                      onChange={() => {}}
                      clearable
                    />
                  }
                />
              )}
              {isRemoteAuthorisation && (
                <InputWithLabelRow
                  label={t('label.auth-status')}
                  Input={
                    <Typography>
                      {t(getApprovalStatusKey(approvalStatus))}
                    </Typography>
                  }
                />
              )}
            </Box>
            <Box display="flex" flex={1} flexDirection="column" gap={1}>
              <InputWithLabelRow
                label={t('label.program')}
                Input={<BasicTextInput disabled value={programName ?? ''} />}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
