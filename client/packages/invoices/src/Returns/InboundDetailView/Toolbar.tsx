import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  DropdownMenu,
  useTranslation,
  DropdownMenuItem,
  DeleteIcon,
  useIsGrouped,
  Switch,
  useBufferState,
  Alert,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { InboundReturnFragment, useReturns } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation('distribution');
  const isDisabled = useReturns.utils.inboundIsDisabled();

  const { data } = useReturns.document.inboundReturn();
  const { otherPartyName, theirReference, id = '' } = data ?? {};

  const onDelete = useReturns.lines.deleteSelectedInboundLines({
    returnId: id,
  });
  const { debouncedMutateAsync } = useReturns.document.updateInboundReturn();

  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundReturn');

  const update = (data: Partial<InboundReturnFragment>) => {
    if (!id) return;
    debouncedMutateAsync({ id, ...data });
  };

  const [theirReferenceBuffer, setTheirReferenceBuffer] =
    useBufferState(theirReference);

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
            {otherPartyName && (
              <InputWithLabelRow
                label={t('label.customer-name')}
                Input={<BasicTextInput value={otherPartyName} disabled />}
              />
            )}
            <InputWithLabelRow
              label={t('label.customer-ref')}
              Input={
                <BasicTextInput
                  size="small"
                  sx={{ width: 250 }}
                  disabled={isDisabled}
                  value={theirReferenceBuffer ?? ''}
                  onChange={event => {
                    setTheirReferenceBuffer(event.target.value);
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
            <InfoAlert inboundReturn={data} />
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
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};

const InfoAlert = ({
  inboundReturn,
}: {
  inboundReturn: InboundReturnFragment | undefined;
}) => {
  const t = useTranslation('distribution');
  const loadMessage = (inboundReturn: InboundReturnFragment | undefined) => {
    if (!inboundReturn?.linkedShipment?.id) {
      return t('info.manual-return');
    }
    if (inboundReturn?.status === InvoiceNodeStatus.Shipped) {
      return `${t('info.automatic-return')} ${t(
        'info.automatic-return-no-edit'
      )}`;
    }
    return t('info.automatic-return');
  };

  return <Alert severity="info">{loadMessage(inboundReturn)}</Alert>;
};
