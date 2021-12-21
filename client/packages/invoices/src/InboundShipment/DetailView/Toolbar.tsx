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
import { NameSearchInput } from '@openmsupply-client/system/src/Name';
import { useDeleteInboundLine, useInboundFields, useInboundItems } from './api';
import { InboundShipment, InboundShipmentItem } from '../../types';
import { isInboundEditable } from '../../utils';

interface ToolbarProps {
  draft: InboundShipment;
}

export const Toolbar: FC<ToolbarProps> = ({ draft }) => {
  const { data } = useInboundItems();
  const { mutate } = useDeleteInboundLine();
  const { otherParty, theirReference, update } = useInboundFields([
    'otherParty',
    'theirReference',
  ]);

  if (!data) return null;

  const t = useTranslation(['replenishment', 'common']);
  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: (
      Object.keys(state.rowState)
        .filter(id => state.rowState[id]?.isSelected)
        .map(selectedId => data.find(({ id }) => selectedId === id))
        .filter(Boolean) as InboundShipmentItem[]
    )
      .map(({ batches }) => Object.values(batches))
      .flat()
      .map(({ id }) => id),
  }));

  const deleteAction = async () => {
    if (selectedRows && selectedRows?.length > 0) {
      const number = selectedRows?.length;
      const onSuccess = success(t('message.deleted-lines', { number }));
      mutate(selectedRows, {
        onSuccess,
      });
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
          <Box display="flex" flex={1} flexDirection="column" gap={1}>
            {otherParty && (
              <InputWithLabelRow
                label={t('label.supplier-name')}
                Input={
                  <NameSearchInput
                    type="supplier"
                    disabled={!isInboundEditable(draft)}
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
                  disabled={!isInboundEditable(draft)}
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
        <DropdownMenu
          disabled={!isInboundEditable(draft)}
          label={t('label.select')}
        >
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
            {t('button.delete-lines', { ns: 'distribution' })}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
