import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  SearchBar,
  Typography,
  BufferedTextInput,
  Tooltip,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';

import { useResponse } from '../../api';
import { getApprovalStatusKey } from '../../../utils';
import { ToolbarDropDown } from './ToolbarDropDown';

export const Toolbar: FC = () => {
  const t = useTranslation();
  const isDisabled = useResponse.utils.isDisabled();
  const { itemFilter, setItemFilter } = useResponse.line.list();

  const {
    approvalStatus,
    otherParty,
    theirReference,
    update,
    linkedRequisition,
  } = useResponse.document.fields([
    'approvalStatus',
    'otherParty',
    'theirReference',
    'shipments',
    'linkedRequisition',
  ]);

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
        <Grid item display="flex" flex={1}>
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
                        update({ otherParty: newOtherParty });
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
          </Box>
        </Grid>
        <SearchBar
          placeholder={t('placeholder.filter-items')}
          value={itemFilter}
          onChange={newValue => {
            setItemFilter(newValue);
          }}
          debounceTime={0}
        />
        <ToolbarDropDown
          isDisabled={isDisabled}
          hasLinkedRequisition={!!linkedRequisition}
        />
      </Grid>
    </AppBarContentPortal>
  );
};
