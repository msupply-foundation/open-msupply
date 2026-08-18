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
  SearchBar,
  DisabledStoreNotice,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';
import { useResponse } from '../../api';
import { getApprovalStatusKey } from '../../../utils';
import { useResponseLines } from '../../api/hooks/line/useResponseLines';

export const Toolbar = () => {
  const t = useTranslation();
  const isDisabled = useResponse.utils.isDisabled();
  const { itemFilter, setItemFilter } = useResponseLines();

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
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        display="flex"
        flex={1}
        gap={1}
        sx={{
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'flex-end' },
        }}
      >
        <Grid display="flex" flex={1}>
          <Box
            display="flex"
            sx={{
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 1, md: 4 },
            }}
          >
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
                      width={250}
                    />
                  }
                />
              )}
              <InputWithLabelRow
                label={t('label.customer-ref')}
                Input={
                  <Tooltip title={theirReference} placement="bottom-start">
                    <Box>
                      <BufferedTextInput
                        disabled={isDisabled}
                        size="small"
                        sx={{ width: 250 }}
                        value={theirReference}
                        onChange={e => update({ theirReference: e.target.value })}
                        inputProps={{
                          'data-testid': 'customer-reference-field',
                        }}
                      />
                    </Box>
                  </Tooltip>
                }
              />
              {!!destinationCustomer && (
                <InputWithLabelRow
                  label={t('label.destination-customer')}
                  Input={
                    <CustomerSearchInput
                      disabled
                      value={destinationCustomer ?? null}
                      onChange={() => {}}
                      clearable
                      width={250}
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
              <DisabledStoreNotice otherParty={otherParty} />
            </Box>
            <Box display="flex" flex={1} flexDirection="column" gap={1}>
              <InputWithLabelRow
                label={t('label.program')}
                Input={<BasicTextInput disabled value={programName ?? ''} />}
              />
            </Box>
          </Box>
        </Grid>
        <SearchBar
          placeholder={t('placeholder.filter-items')}
          value={itemFilter}
          onChange={newValue => {
            setItemFilter(newValue);
          }}
          debounceTime={0}
          inputTestId="filter-input-itemCodeOrName"
        />
      </Grid>
    </AppBarContentPortal>
  );
};
