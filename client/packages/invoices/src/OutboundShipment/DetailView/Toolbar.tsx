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
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';
import { useOutbound } from '../api';

export const Toolbar: FC = () => {
  const onDelete = useOutbound.line.deleteSelected();
  const { onAllocate } = useOutbound.line.allocateSelected();
  const { id, otherParty, theirReference, update } = useOutbound.document.fields([
    'id',
    'otherParty',
    'theirReference',
  ]);
  const [theirReferenceBuffer, setTheirReferenceBuffer] =
    useBufferState(theirReference);
  const { mutateAsync: onUpdate } = useOutbound.document.updateName();

  const isDisabled = useOutbound.utils.isDisabled();
  const t = useTranslation('distribution');

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
                    disabled={isDisabled}
                    value={otherParty}
                    onChange={async ({ id: otherParty }) => {
                      await onUpdate({ id,
                        otherPartyId: otherParty });
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
        <DropdownMenu label={t('label.actions')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
            {t('button.delete-lines')}
          </DropdownMenuItem>
          <DropdownMenuItem IconComponent={ZapIcon} onClick={onAllocate}>
            {t('button.allocate-lines')}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
