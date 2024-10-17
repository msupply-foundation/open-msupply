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
  Switch,
  InvoiceNodeStatus,
  Alert,
  ArrowLeftIcon,
  RewindIcon,
  Tooltip,
} from '@openmsupply-client/common';
import { SupplierSearchInput } from '@openmsupply-client/system';
import { InboundLineFragment, InboundRowFragment, useInbound } from '../api';

const InboundInfoPanel = ({
  shipment,
}: {
  shipment: InboundRowFragment | undefined;
}) => {
  const t = useTranslation('replenishment');
  const loadMessage = (shipment: InboundRowFragment | undefined) => {
    if (!shipment?.linkedShipment?.id) {
      return t('info.manual-shipment');
    }
    if (shipment?.status === InvoiceNodeStatus.Shipped) {
      return `${t('info.automatic-shipment')} ${t(
        'info.automatic-shipment-no-edit'
      )}`;
    }
    return t('info.automatic-shipment');
  };

  return <Alert severity="info">{loadMessage(shipment)}</Alert>;
};

export const Toolbar: FC<{
  onReturnLines: (selectedLines: InboundLineFragment[]) => void;
}> = ({ onReturnLines }) => {
  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.lines.items();
  const { data: shipment } = useInbound.document.get();

  const onDelete = useInbound.lines.deleteSelected();
  const onZeroQuantities = useInbound.lines.zeroQuantities();
  const { otherParty, theirReference, update } = useInbound.document.fields([
    'otherParty',
    'theirReference',
  ]);
  const { isGrouped, toggleIsGrouped } = useInbound.lines.rows();
  const t = useTranslation('replenishment');

  const selectedLines = useInbound.utils.selectedLines();

  const isTransfer = !!shipment?.linkedShipment?.id;
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
                  <SupplierSearchInput
                    disabled={isDisabled || isTransfer}
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
                <Tooltip title={theirReference} placement="bottom-start">
                  <BufferedTextInput
                    disabled={isDisabled}
                    size="small"
                    sx={{ width: 250 }}
                    value={theirReference ?? ''}
                    onChange={event => {
                      update({ theirReference: event.target.value });
                    }}
                  />
                </Tooltip>
              }
            />
            <InboundInfoPanel shipment={shipment} />
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
            <DropdownMenuItem
              IconComponent={ArrowLeftIcon}
              onClick={() => onReturnLines(selectedLines)}
            >
              {t('button.return-lines')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isDisabled}
              IconComponent={DeleteIcon}
              onClick={onDelete}
            >
              {t('button.delete-lines')}
            </DropdownMenuItem>
            <DropdownMenuItem
              IconComponent={RewindIcon}
              onClick={onZeroQuantities}
              disabled={isDisabled}
            >
              {t('button.zero-line-quantity')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
