import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  useTranslation,
  useBufferState,
  Switch,
  useIsGrouped,
  Tooltip,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';
import { useOutbound } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation();
  const { id, otherParty, theirReference, update, requisition } =
    useOutbound.document.fields([
      'id',
      'otherParty',
      'theirReference',
      'requisition',
    ]);
  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundShipment');
  const [theirReferenceBuffer, setTheirReferenceBuffer] =
    useBufferState(theirReference);
  const { mutateAsync: updateName } = useOutbound.document.updateName();

  const isDisabled = useOutbound.utils.isDisabled();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={1}>
            {otherParty && (
              <InputWithLabelRow
                label={t('label.customer-name')}
                sx={{ minWidth: 100 }}
                Input={
                  <CustomerSearchInput
                    disabled={isDisabled || !!requisition}
                    value={otherParty}
                    onChange={async ({ id: otherPartyId }) => {
                      await updateName({ id, otherPartyId });
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.customer-ref')}
              Input={
                <Tooltip title={theirReferenceBuffer} placement="bottom-start">
                  <BasicTextInput
                    disabled={isDisabled}
                    size="small"
                    sx={{ width: 250 }}
                    value={theirReferenceBuffer ?? ''}
                    onChange={event => {
                      setTheirReferenceBuffer(event.target.value);
                      update({ theirReference: event.target.value });
                    }}
                  />
                </Tooltip>
              }
            />
          </Box>
        </Grid>
        <Grid
          display="flex"
          gap={1}
          justifyContent="flex-end"
          alignItems="center"
        >
          <Box sx={{ marginRight: 2 }}>
            <Switch
              label={t('label.group-by-item')}
              onChange={toggleIsGrouped}
              checked={isGrouped}
              size="small"
              color="secondary"
            />
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
