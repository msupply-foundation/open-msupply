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
  useNotification,
  useTableStore,
} from '@openmsupply-client/common';
import { NameSearchInput } from '@openmsupply-client/system';
import {
  useDeleteInboundLine,
  useInboundFields,
  useInboundItems,
  useInboundLines,
  useIsInboundEditable,
} from '../api';
import { InboundShipmentItem, InvoiceLine } from '../../types';

export const Toolbar: FC = () => {
  const isEditable = useIsInboundEditable();
  const { data } = useInboundItems();
  const lines = useInboundLines();

  const { mutate } = useDeleteInboundLine();
  const { otherParty, theirReference, update } = useInboundFields([
    'otherParty',
    'theirReference',
  ]);

  const t = useTranslation('replenishment');
  const { success, info } = useNotification();
  const { selectedRows } = useTableStore(state => {
    const { isGrouped } = state;

    if (isGrouped) {
      return {
        selectedRows: (
          Object.keys(state.rowState)
            .filter(id => state.rowState[id]?.isSelected)
            .map(selectedId => data?.find(({ id }) => selectedId === id))
            .filter(Boolean) as InboundShipmentItem[]
        )
          .map(({ lines }) => lines)
          .flat()
          .map(({ id }) => id),
      };
    } else {
      return {
        selectedRows: (
          Object.keys(state.rowState)
            .filter(id => state.rowState[id]?.isSelected)
            .map(selectedId => lines.find(({ id }) => selectedId === id))
            .filter(Boolean) as InvoiceLine[]
        ).map(({ id }) => id),
      };
    }
  });

  const deleteAction = async () => {
    if (selectedRows && selectedRows?.length > 0) {
      const number = selectedRows?.length;
      const onSuccess = success(t('messages.deleted-lines', { number }));
      mutate(selectedRows, {
        onSuccess,
      });
    } else {
      const infoSnack = info(t('label.select-rows-to-delete-them'));
      infoSnack();
    }
  };

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
                  <NameSearchInput
                    type="supplier"
                    disabled={!isEditable}
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
                  disabled={!isEditable}
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
        <DropdownMenu disabled={!isEditable} label={t('label.select')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
