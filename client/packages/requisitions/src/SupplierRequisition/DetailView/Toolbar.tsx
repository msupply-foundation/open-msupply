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
  // useNotification,
  // useTableStore,
  // DatePickerInput,
  // useBufferState,
} from '@openmsupply-client/common';
import { NameSearchInput } from '@openmsupply-client/system/src/Name';
// import { RequisitionLine } from '../../types';
import {
  useRequestRequisitionFields,
  useIsRequestRequisitionDisabled,
} from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation(['replenishment', 'common']);

  // const { success, info } = useNotification();
  const isDisabled = useIsRequestRequisitionDisabled();
  const { theirReference, update, otherParty } = useRequestRequisitionFields([
    'theirReference',
    'otherParty',
  ]);
  // const [bufferedDate, setBufferedDate] = useBufferState(requisitionDate);

  // const { selectedRows } = useTableStore(state => ({
  //   selectedRows: Object.keys(state.rowState)
  //     .filter(id => state.rowState[id]?.isSelected)
  //     .map(selectedId => lines?.find(({ id }) => selectedId === id))
  //     .filter(Boolean) as RequisitionLine[],
  // }));

  // const deleteAction = () => {
  //   if (selectedRows && selectedRows?.length > 0) {
  //     const successSnack = success(`Deleted ${selectedRows?.length} lines`);
  //     successSnack();
  //   } else {
  //     const infoSnack = info(t('label.select-rows-to-delete-them'));
  //     infoSnack();
  //   }
  // };

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
            <Box display="flex" flex={1} flexDirection="column" gap={1}>
              {/* <InputWithLabelRow
                label={t('label.requisition-date')}
                Input={
                  <DatePickerInput
                    disabled={isDisabled}
                    value={bufferedDate ?? null}
                    onChange={d => {
                      setBufferedDate(d);
                      update({ requisitionDate: d });
                    }}
                  />
                }
              /> */}
            </Box>
          </Box>
        </Grid>
        <DropdownMenu disabled={isDisabled} label={t('label.select')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={() => {}}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
