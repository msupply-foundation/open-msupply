import React, { FC } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { useRequest } from '../../api';
import { ToolbarDropDown } from './ToolbarDropDown';
import { ToolbarActions } from './ToolbarActions';

export const Toolbar: FC = () => {
  const t = useTranslation('replenishment');
  const isDisabled = useRequest.utils.isDisabled();
  const { itemFilter, setItemFilter } = useRequest.line.list();
  const { theirReference, update, otherParty } = useRequest.document.fields([
    'theirReference',
    'otherParty',
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
                  disabled={isDisabled}
                  value={otherParty ?? null}
                  onChange={otherParty => update({ otherParty })}
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
        </Grid>
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
