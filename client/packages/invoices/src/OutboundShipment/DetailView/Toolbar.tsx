import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  DropdownMenu,
  useTranslation,
} from '@openmsupply-client/common';
import { NameSearchInput } from '@openmsupply-client/system';
import { useOutboundFields, useIsOutboundDisabled } from '../api';

export const Toolbar: FC = () => {
  const { otherParty, theirReference, update } = useOutboundFields([
    'otherParty',
    'theirReference',
  ]);
  const isDisabled = useIsOutboundDisabled();
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
                  <NameSearchInput
                    type="customer"
                    disabled={isDisabled}
                    value={otherParty}
                    onChange={otherParty => {
                      update({ otherParty });
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
                  value={theirReference ?? ''}
                  onChange={event => {
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
          </Box>
        </Grid>
        <DropdownMenu disabled={isDisabled} label={t('label.select')}>
          {/* <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
            {t('button.delete-lines')}
          </DropdownMenuItem> */}
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
