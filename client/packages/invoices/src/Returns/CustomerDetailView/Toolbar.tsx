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
  Alert,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { CustomerReturnFragment, useReturns } from '../api';
import { CustomerSearchInput } from '@openmsupply-client/system';

export const Toolbar: FC = () => {
  const t = useTranslation('distribution');
  const isDisabled = useReturns.utils.customerIsDisabled();

  const { bufferedState, setBufferedState } =
    useReturns.document.customerReturn();
  const {
    otherParty,
    theirReference,
    id,
    linkedShipment = '',
  } = bufferedState ?? {};

  const onDelete = () => {
    if (!id) return;
    useReturns.lines.deleteSelectedCustomerLines({ returnId: id });
  };
  const { debouncedMutateAsync } = useReturns.document.updateCustomerReturn();

  const { isGrouped, toggleIsGrouped } = useIsGrouped('customerReturn');

  const update = (data: Partial<CustomerReturnFragment>) => {
    if (!id) return;
    setBufferedState({ ...data });
    debouncedMutateAsync({ id, ...data });
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
                label={t('label.customer-name')}
                Input={
                  <CustomerSearchInput
                    disabled={isDisabled || !!linkedShipment}
                    value={otherParty}
                    onChange={name => {
                      update({ otherPartyId: name.id });
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.customer-ref')}
              Input={
                <BasicTextInput
                  size="small"
                  sx={{ width: 250 }}
                  disabled={isDisabled}
                  value={theirReference}
                  onChange={event => {
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
            <InfoAlert customerReturn={bufferedState} />
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
              IconComponent={DeleteIcon}
              onClick={onDelete}
              disabled={isDisabled}
            >
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};

const InfoAlert = ({
  customerReturn,
}: {
  customerReturn: CustomerReturnFragment | undefined;
}) => {
  const t = useTranslation('distribution');
  const loadMessage = (customerReturn: CustomerReturnFragment | undefined) => {
    if (!customerReturn?.linkedShipment?.id) {
      return t('info.manual-return');
    }
    if (customerReturn?.status === InvoiceNodeStatus.Shipped) {
      return `${t('info.automatic-return')} ${t(
        'info.automatic-return-no-edit'
      )}`;
    }
    return t('info.automatic-return');
  };

  return <Alert severity="info">{loadMessage(customerReturn)}</Alert>;
};
