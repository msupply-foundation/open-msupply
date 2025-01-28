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
  DropdownMenuItem,
  DeleteIcon,
  ZapIcon,
  Switch,
  useIsGrouped,
  ArrowLeftIcon,
  Tooltip,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';
import { useOutbound } from '../api';

export const Toolbar: FC<{
  onReturnLines: (stockLineIds: string[]) => void;
}> = ({ onReturnLines }) => {
  const t = useTranslation('distribution');
  const onDelete = useOutbound.line.deleteSelected();
  const { onAllocate } = useOutbound.line.allocateSelected();
  const { id, otherParty, theirReference, update, requisition } =
    useOutbound.document.fields([
      'id',
      'otherParty',
      'theirReference',
      'requisition',
    ]);
  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundShipment');
  const [theirReferenceBuffer, setTheirReferenceBuffer] =
    useBufferState(theirReference);
  const { mutateAsync: updateName } = useOutbound.document.updateName();

  const isDisabled = useOutbound.utils.isDisabled();

  const selectedIds = useOutbound.utils.selectedIds();

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
                  <CustomerSearchInput
                    disabled={isDisabled || !!requisition}
                    value={otherParty}
                    onChange={async ({ id: otherPartyId }) => {
                      await updateName({ id, otherPartyId });
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.customer-ref')}
              Input={
                <Tooltip title={theirReferenceBuffer} placement="bottom-start">
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
                </Tooltip>
              }
            />
          </Box>
        </Grid>
        <Grid
          item
          display="flex"
          gap={1}
          justifyContent="flex-end"
          alignItems="center"
        >
          <Box sx={{ marginRight: 2 }}>
            <Switch
              label={t('label.group-by-item')}
              onChange={toggleIsGrouped}
              checked={isGrouped}
              size="small"
              color="secondary"
            />
          </Box>
          <DropdownMenu label={t('label.actions')}>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines')}
            </DropdownMenuItem>
            <DropdownMenuItem IconComponent={ZapIcon} onClick={onAllocate}>
              {t('button.allocate-lines')}
            </DropdownMenuItem>

            <DropdownMenuItem
              IconComponent={ArrowLeftIcon}
              onClick={() => onReturnLines(selectedIds)}
            >
              {t('button.return-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
