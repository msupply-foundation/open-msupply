import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  SearchBar,
  Typography,
  BufferedTextInput,
  Alert,
  Tooltip,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';

import { useResponse } from '../api';
import { getApprovalStatusKey } from '../../utils';

export const Toolbar: FC = () => {
  const t = useTranslation('distribution');
  const isDisabled = useResponse.utils.isDisabled();
  const { itemFilter, setItemFilter } = useResponse.line.list();

  const {
    approvalStatus,
    otherParty,
    theirReference,
    shipments,
    update,
    programName,
    period,
    orderType,
  } = useResponse.document.fields([
    'approvalStatus',
    'otherParty',
    'theirReference',
    'shipments',
    'programName',
    'period',
    'orderType',
  ]);
  const { onDelete } = useResponse.line.delete();
  const noLinkedShipments = (shipments?.totalCount ?? 0) === 0;
  const showInfo = noLinkedShipments && !isDisabled;
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
              {orderType && (
                <InputWithLabelRow
                  label={t('label.order-type')}
                  Input={<Typography>{orderType ?? ''}</Typography>}
                />
              )}
              {programName && (
                <InputWithLabelRow
                  label={t('label.program')}
                  Input={<Typography>{programName ?? ''}</Typography>}
                />
              )}
              {period && (
                <InputWithLabelRow
                  label={t('label.period')}
                  Input={<Typography>{period?.name ?? ''}</Typography>}
                />
              )}
            </Box>
          </Box>
          {showInfo && (
            <Box padding={2}>
              <Alert severity="info">{t('info.no-shipment')}</Alert>
            </Box>
          )}
        </Grid>
        <SearchBar
          placeholder={t('placeholder.filter-items')}
          value={itemFilter}
          onChange={newValue => {
            setItemFilter(newValue);
          }}
          debounceTime={0}
        />

        <DropdownMenu label={t('label.actions')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
