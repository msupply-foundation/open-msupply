import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  useTranslation,
  useIsGrouped,
  Switch,
} from '@openmsupply-client/common';
import { SupplierReturnFragment, useReturns } from '../api';
import { SupplierSearchInput } from '@openmsupply-client/system';

export const Toolbar: FC = () => {
  const t = useTranslation();
  const { debouncedMutateAsync } = useReturns.document.updateSupplierReturn();

  const { bufferedState, setBufferedState } =
    useReturns.document.supplierReturn();
  const { otherParty, theirReference, id, originalShipment } =
    bufferedState ?? { id: '' };
  const { isGrouped, toggleIsGrouped } = useIsGrouped('supplierReturn');
  const { mutateAsync: updateOtherParty } =
    useReturns.document.updateOtherParty();

  const update = (data: Partial<SupplierReturnFragment>) => {
    if (!id) return;
    setBufferedState({ ...data });
    debouncedMutateAsync({ id, ...data });
  };

  const isDisabled = useReturns.utils.supplierIsDisabled();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={1}>
            {otherParty && (
              <InputWithLabelRow
                label={t('label.supplier-name')}
                sx={{ minWidth: 100 }}
                Input={
                  <SupplierSearchInput
                    disabled={isDisabled || !!originalShipment}
                    value={otherParty}
                    onChange={async ({ id: otherPartyId }) => {
                      await updateOtherParty({ id, otherPartyId });
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.supplier-ref')}
              Input={
                <BasicTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={theirReference}
                  onChange={event => {
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
          </Box>
        </Grid>
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
      </Grid>
    </AppBarContentPortal>
  );
};
