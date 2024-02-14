import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  DropdownMenu,
  useTranslation,
  useBufferState,
  DropdownMenuItem,
  DeleteIcon,
  ZapIcon,
  Switch,
  useIsGrouped,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';
import { useReturn } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation('distribution');
  const onDelete = useReturn.line.deleteSelected();
  const { onAllocate } = useReturn.line.allocateSelected();
  const { id, otherParty, theirReference, update, requisition } =
    useReturn.document.fields([
      'id',
      'otherParty',
      'theirReference',
      'requisition',
    ]);
  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundShipment');
  const [theirReferenceBuffer, setTheirReferenceBuffer] =
    useBufferState(theirReference);
  const { mutateAsync: updateName } = useReturn.document.updateName();

  const isDisabled = useReturn.utils.isDisabled();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid item display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={1}>
            {otherParty && (
              <InputWithLabelRow
                label={t('label.customer-name')}
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
              }
            />
          </Box>
        </Grid>
        <Grid
          item
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
          <DropdownMenu label={t('label.actions')}>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines')}
            </DropdownMenuItem>
            <DropdownMenuItem IconComponent={ZapIcon} onClick={onAllocate}>
              {t('button.allocate-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
