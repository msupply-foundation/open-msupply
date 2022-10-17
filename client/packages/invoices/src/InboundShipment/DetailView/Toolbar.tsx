import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  InfoPanel,
} from '@openmsupply-client/common';
import { SupplierSearchInput } from '@openmsupply-client/system';
import { useInbound } from '../api';

export const Toolbar: FC = () => {
  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.lines.items();
  const { data: shipment } = useInbound.document.get();

  const onDelete = useInbound.lines.deleteSelected();
  const { otherParty, theirReference, update } = useInbound.document.fields([
    'otherParty',
    'theirReference',
  ]);

  const t = useTranslation('replenishment');
  const isManuallyCreated = !shipment?.linkedShipment?.id;

  if (!data) return null;

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
                label={t('label.supplier-name')}
                Input={
                  <SupplierSearchInput
                    disabled={isDisabled}
                    value={otherParty}
                    onChange={name => {
                      update({ otherParty: name });
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.supplier-ref')}
              Input={
                <BufferedTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={theirReference ?? ''}
                  onChange={event => {
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
            <InfoPanel
              message={t(
                isManuallyCreated
                  ? 'info.manual-shipment'
                  : 'info.automatic-shipment'
              )}
            />
          </Box>
        </Grid>
        <DropdownMenu label={t('label.actions')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
            {t('button.delete-lines')}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
