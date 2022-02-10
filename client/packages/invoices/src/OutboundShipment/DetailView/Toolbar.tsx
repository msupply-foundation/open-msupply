import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  DropdownMenu,
  useTranslation,
  useBufferState,
  useTableStore,
  useNotification,
  DropdownMenuItem,
  DeleteIcon,
} from '@openmsupply-client/common';
import { NameSearchInput } from '@openmsupply-client/system';
import {
  useOutboundFields,
  useIsOutboundDisabled,
  useDeleteInboundLine,
  useOutboundRows,
} from '../api';
import { InvoiceItem, InvoiceLine } from '../../types';

export const Toolbar: FC = () => {
  const { success, info } = useNotification();
  const { items, lines } = useOutboundRows();
  const { mutate } = useDeleteInboundLine();
  const { otherParty, theirReference, update } = useOutboundFields([
    'otherParty',
    'theirReference',
  ]);
  const [theirReferenceBuffer, setTheirReferenceBuffer] =
    useBufferState(theirReference);

  const { selectedRows } = useTableStore(state => {
    const { isGrouped } = state;

    if (isGrouped) {
      return {
        selectedRows: (
          Object.keys(state.rowState)
            .filter(id => state.rowState[id]?.isSelected)
            .map(selectedId => items?.find(({ id }) => selectedId === id))
            .filter(Boolean) as InvoiceItem[]
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
      const onSuccess = success(t('message.deleted-lines', { number }));
      mutate(selectedRows, {
        onSuccess,
      });
    } else {
      const infoSnack = info(t('label.select-rows-to-delete-them'));
      infoSnack();
    }
  };

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
                  value={theirReferenceBuffer ?? ''}
                  onChange={event => {
                    setTheirReferenceBuffer(event.target.value);
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
          </Box>
        </Grid>
        <DropdownMenu disabled={isDisabled} label={t('label.select')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
            {t('button.delete-lines')}
          </DropdownMenuItem>
        </DropdownMenu>
      </Grid>
    </AppBarContentPortal>
  );
};
