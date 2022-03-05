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
import { NameSearchInput } from '@openmsupply-client/system/src/Name';
import {
  useRequestFields,
  useIsRequestDisabled,
  useDeleteRequestLines,
} from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation(['replenishment', 'common']);
  const { onDelete } = useDeleteRequestLines();

  const isDisabled = useIsRequestDisabled();
  const { theirReference, update, otherParty } = useRequestFields([
    'theirReference',
    'otherParty',
  ]);

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
          <Box display="flex" flexDirection="row" gap={4}>
            <Box display="flex" flex={1} flexDirection="column" gap={1}>
              {otherParty && (
                <InputWithLabelRow
                  label={t('label.supplier-name')}
                  Input={
                    <NameSearchInput
                      type="supplier"
                      disabled={isDisabled}
                      value={otherParty ?? null}
                      onChange={otherParty => {
                        update({ otherParty });
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
                    value={theirReference}
                    onChange={e => update({ theirReference: e.target.value })}
                  />
                }
              />
            </Box>
          </Box>
        </Grid>
        <DropdownMenu disabled={isDisabled} label={t('label.select')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
