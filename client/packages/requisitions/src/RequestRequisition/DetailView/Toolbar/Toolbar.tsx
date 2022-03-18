import React, { Dispatch, SetStateAction } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { useRequestFields, useIsRequestDisabled } from '../../api';
import { ToolbarDropDown } from './ToolbarDropDown';
import { ToolbarActions } from './ToolbarActions';

interface ToolbarProps {
  filter: {
    itemFilter: string;
    setItemFilter: Dispatch<SetStateAction<string>>;
  };
}

export const Toolbar = ({
  filter: { itemFilter, setItemFilter },
}: ToolbarProps) => {
  const t = useTranslation('replenishment');
  const isDisabled = useIsRequestDisabled();
  const { theirReference, update, otherParty } = useRequestFields([
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
        <Grid item display="flex" flex={1} direction="column" gap={1}>
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
