import React from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  Switch,
  InvoiceNodeStatus,
  Alert,
  Tooltip,
  BufferedTextArea,
} from '@openmsupply-client/common';
import { SupplierSearchInput } from '@openmsupply-client/system';
import { InboundRowFragment, useInbound } from '../api';

const InboundInfoPanel = ({
  shipment,
}: {
  shipment: InboundRowFragment | undefined;
}) => {
  const t = useTranslation();
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

interface ToolbarProps {
  simplifiedTabletView?: boolean;
}

export const Toolbar = ({ simplifiedTabletView }: ToolbarProps) => {
  const t = useTranslation();

  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.lines.items();
  const { data: shipment } = useInbound.document.get();

  const { otherParty, theirReference, update } = useInbound.document.fields([
    'otherParty',
    'theirReference',
  ]);
  const { isGrouped, toggleIsGrouped } = useInbound.lines.rows();

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
        gap={1}
      >
        <Grid display="flex" flex={1}>
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
                  <BufferedTextArea
                    disabled={isDisabled}
                    size="small"
                    sx={{ width: 250 }}
                    value={theirReference ?? ''}
                    onChange={event => {
                      update({ theirReference: event.target.value });
                    }}
                    maxRows={2}
                    minRows={1}
                    slotProps={{
                      input: {
                        sx: {
                          backgroundColor: theme =>
                            isDisabled
                              ? theme.palette.background.toolbar
                              : theme.palette.background.menu,
                        },
                      },
                    }}
                  />
                </Tooltip>
              }
            />
            <InboundInfoPanel shipment={shipment} />
          </Box>
        </Grid>
        {!simplifiedTabletView && (
          <Grid
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
          </Grid>
        )}
      </Grid>
    </AppBarContentPortal>
  );
};
