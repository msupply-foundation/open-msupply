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
  useNotification,
  useTableStore,
} from '@openmsupply-client/common';
import { NameSearchInput } from '@openmsupply-client/system';

import {
  useResponseRequisitionFields,
  useIsResponseRequisitionDisabled,
  ResponseLineFragment,
} from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation(['distribution', 'common']);
  const { success, info } = useNotification();
  const isDisabled = useIsResponseRequisitionDisabled();
  const { lines, otherParty, theirReference, update } =
    useResponseRequisitionFields(['lines', 'otherParty', 'theirReference']);

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => lines.nodes.find(({ id }) => selectedId === id))
      .filter(Boolean) as ResponseLineFragment[],
  }));

  const deleteAction = () => {
    if (selectedRows && selectedRows?.length > 0) {
      const successSnack = success(`Deleted ${selectedRows?.length} lines`);
      successSnack();
    } else {
      const infoSnack = info(t('label.select-rows-to-delete-them'));
      infoSnack();
    }
  };

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
                  label={t('label.customer-name')}
                  Input={
                    <NameSearchInput
                      type="customer"
                      disabled={isDisabled}
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
            </Box>
          </Box>
        </Grid>
        <DropdownMenu disabled={isDisabled} label={t('label.select')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
