import React, { FC } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
  Alert,
  Tooltip,
  Switch,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { useHideOverStocked, useRequest } from '../../api';
import { ToolbarDropDown } from './ToolbarDropDown';

export const Toolbar: FC = () => {
  const { on, toggle } = useHideOverStocked();
  const t = useTranslation('replenishment');
  const isDisabled = useRequest.utils.isDisabled();
  const isProgram = useRequest.utils.isProgram();
  const { itemFilter, setItemFilter } = useRequest.line.list();
  const { theirReference, update, otherParty, programName } =
    useRequest.document.fields(['theirReference', 'otherParty', 'programName']);

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        marginBottom: 1,
        flexDirection: 'column',
      }}
    >
      <Grid container gap={2} flexWrap="nowrap">
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          {otherParty && (
            <InputWithLabelRow
              label={t('label.supplier-name')}
              Input={
                <InternalSupplierSearchInput
                  disabled={isDisabled || isProgram}
                  value={otherParty ?? null}
                  onChange={otherParty => update({ otherParty })}
                />
              }
            />
          )}
          <InputWithLabelRow
            label={t('label.supplier-ref')}
            Input={
              <Tooltip title={theirReference} placement="bottom-start">
                <BufferedTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={theirReference ?? null}
                  onChange={e => update({ theirReference: e.target.value })}
                />
              </Tooltip>
            }
          />
        </Grid>
        <Grid item>
          {programName && (
            <Alert severity="info" sx={{ marginTop: 1, maxWidth: '378px' }}>
              {t('info.cannot-edit-program-requisition')}
            </Alert>
          )}
        </Grid>
      </Grid>
      <Grid
        item
        display="flex"
        gap={1}
        alignItems="flex-end"
        justifyContent="flex-end"
        sx={{ marginTop: 1, flexWrap: 'wrap' }}
      >
        <Grid item>
          <Switch
            label={t('label.hide-stock-over-minimum')}
            onChange={toggle}
            checked={on}
            color="secondary"
            size="small"
            labelSx={{ margin: '5px 0' }}
          />
        </Grid>
        <Grid item display="flex" gap={1} alignItems="flex-end">
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
      </Grid>
    </AppBarContentPortal>
  );
};
