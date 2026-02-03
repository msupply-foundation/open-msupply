import React from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  InvoiceNodeStatus,
  Alert,
  Tooltip,
  BufferedTextArea,
  Link,
  RouteBuilder,
  DateTimePickerInput,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
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

export const Toolbar = () => {
  const t = useTranslation();

  const isDisabled = useInbound.utils.isDisabled();
  const { data: shipment } = useInbound.document.get();

  const { createdDatetime, otherParty, theirReference, purchaseOrder, update } = useInbound.document.fields([
    'createdDatetime',
    'otherParty',
    'theirReference',
    'purchaseOrder',
  ]);

  const isTransfer = !!shipment?.linkedShipment?.id;

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        spacing={2}
        width="100%"
      >
        <Grid>
          <Box display="flex" flexDirection="column" gap={1}>
            {otherParty && (
              <InputWithLabelRow
                label={t('label.supplier-name')}
                Input={
                  <SupplierSearchInput
                    disabled={isDisabled || isTransfer}
                    value={otherParty}
                    onChange={name => {
                      update({ otherParty: name ?? undefined });
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
                              ? theme.palette.background.input.disabled
                              : theme.palette.background.input.main,
                        },
                      },
                    }}
                  />
                </Tooltip>
              }
            />
          </Box>
        </Grid>
        {purchaseOrder && (
          <>
            <Grid>
              <Box display="flex" flex={1} flexDirection="column" gap={1}>
                <InputWithLabelRow
                  label={t('label.purchase-order-number')}
                  Input={
                    <Box height={35} width={150} alignContent={'center'}>
                      <Link
                        to={RouteBuilder.create(AppRoute.Replenishment)
                          .addPart(AppRoute.PurchaseOrder)
                          .addPart(purchaseOrder?.id ?? '')
                          .build()}
                      >{`#${purchaseOrder?.number}`}</Link>
                    </Box>
                  }
                />
                <InputWithLabelRow
                  label={t('label.purchase-order-reference')}
                  Input={
                    <Box height={35} alignContent={'center'}>
                      {`${purchaseOrder?.reference ?? ''}`}
                    </Box>
                  }
                />
              </Box>
            </Grid>
            <Grid>
              <InputWithLabelRow
                label={t('label.created-datetime')}
                Input={
                  <DateTimePickerInput
                    value={DateUtils.getDateOrNull(createdDatetime)}
                    onChange={date =>
                      update({
                        createdDatetime: Formatter.naiveDate(date) ?? undefined,
                      })
                    }
                  />
                }
              />
            </Grid>
          </>
        )}
        <Grid size={12}>
          <InboundInfoPanel shipment={shipment} />
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
