import React, { FC } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
  Typography,
  Box,
  Alert,
  Tooltip,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { useRequest } from '../../api';
import { ToolbarDropDown } from './ToolbarDropDown';
import { ToolbarActions } from './ToolbarActions';
import { getApprovalStatusKey } from '../../../utils';

export const Toolbar: FC = () => {
  const t = useTranslation('replenishment');
  const isDisabled = useRequest.utils.isDisabled();
  const isProgram = useRequest.utils.isProgram();
  const { itemFilter, setItemFilter } = useRequest.line.list();
  const { usesRemoteAuthorisation } = useRequest.utils.isRemoteAuthorisation();
  const {
    linkedRequisition,
    theirReference,
    update,
    otherParty,
    orderType,
    programName,
    period,
  } = useRequest.document.fields([
    'theirReference',
    'otherParty',
    'linkedRequisition',
    'programName',
    'period',
    'orderType',
  ]);

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        marginBottom: 1,
        flexDirection: 'column',
      }}
    >
      <Grid container>
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          {otherParty && (
            <InputWithLabelRow
              label={t('label.supplier-name')}
              Input={
                <InternalSupplierSearchInput
                  disabled={isDisabled || isProgram}
                  value={otherParty ?? null}
                  onChange={otherParty => update({ otherParty })}
                />
              }
            />
          )}
          <InputWithLabelRow
            label={t('label.supplier-ref')}
            Input={
              <Tooltip title={theirReference} placement="bottom-start">
                <BufferedTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={theirReference ?? null}
                  onChange={e => update({ theirReference: e.target.value })}
                />
              </Tooltip>
            }
          />
          {usesRemoteAuthorisation && (
            <InputWithLabelRow
              label={t('label.auth-status')}
              Input={
                <Typography>
                  {t(getApprovalStatusKey(linkedRequisition?.approvalStatus))}
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
        </Grid>
        {programName && (
          <Box padding={2} style={{ maxWidth: 500 }}>
            <Alert severity="info">
              {t('info.cannot-edit-program-requisition')}
            </Alert>
          </Box>
        )}
        <Grid
          item
          flexDirection="column"
          alignItems="flex-end"
          display="flex"
          gap={2}
        >
          <ToolbarActions />
        </Grid>
      </Grid>
      <Grid
        item
        display="flex"
        gap={1}
        justifyContent="flex-end"
        sx={{ marginTop: 2 }}
      >
        <SearchBar
          placeholder={t('placeholder.filter-items')}
          value={itemFilter}
          onChange={newValue => {
            setItemFilter(newValue);
          }}
          debounceTime={0}
        />
        <ToolbarDropDown />
      </Grid>
    </AppBarContentPortal>
  );
};
