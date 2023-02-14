import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  SearchBar,
  InfoPanel,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';

import { useResponse } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation(['distribution', 'common']);
  const isDisabled = useResponse.utils.isDisabled();
  const { itemFilter, setItemFilter } = useResponse.line.list();
  const { otherParty, theirReference, shipments, update } = useResponse.document.fields([
    'lines',
    'otherParty',
    'theirReference',
    'shipments'
  ]);
  const { onDelete } = useResponse.line.delete();
  const linkedToShipment = shipments?.totalCount > 0;

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
                  <BasicTextInput
                    disabled={isDisabled}
                    size="small"
                    sx={{ width: 250 }}
                    value={theirReference}
                    onChange={e => update({ theirReference: e.target.value })}
                  />
                }
              />
              { !linkedToShipment && (
                <InfoPanel
                  message={t('info.no-shipment')}
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
        <DropdownMenu label={t('label.actions')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
