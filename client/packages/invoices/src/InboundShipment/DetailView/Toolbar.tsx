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
} from '@openmsupply-client/common';
import { SupplierSearchInput } from '@openmsupply-client/system';
import {
  useDeleteSelectedLines,
  useInboundFields,
  useInboundItems,
  useIsInboundDisabled,
} from '../api';

export const Toolbar: FC = () => {
  const isDisabled = useIsInboundDisabled();
  const { data } = useInboundItems();

  const { onDelete } = useDeleteSelectedLines();
  const { otherParty, theirReference, update } = useInboundFields([
    'otherParty',
    'theirReference',
  ]);

  const t = useTranslation('replenishment');

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
          </Box>
        </Grid>
        <DropdownMenu label={t('label.select')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
