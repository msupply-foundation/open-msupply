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
import { useInboundFields } from './api';
import { InboundShipment, InboundShipmentItem } from '../../types';
import { isInboundEditable } from '../../utils';

interface ToolbarProps {
  draft: InboundShipment;
  update: (patch: Partial<InboundShipment>) => Promise<InboundShipment>;
}

export const Toolbar: FC<ToolbarProps> = ({ draft }) => {
  const { otherParty, theirReference, update } = useInboundFields([
    'otherParty',
    'theirReference',
  ]);

  const t = useTranslation(['distribution', 'common']);
  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => draft.items.find(({ id }) => selectedId === id))
      .filter(Boolean) as InboundShipmentItem[],
  }));

  const deleteAction = () => {
    if (selectedRows && selectedRows?.length > 0) {
      selectedRows.forEach(item => draft.deleteItem?.(item));
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
