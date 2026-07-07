import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  InvoiceNodeType,
  useTranslation,
  useNavigate,
  RouteBuilder,
  DisabledStoreNotice,
} from '@openmsupply-client/common';
import { SupplierReturnFragment, useReturns } from '../api';
import { SupplierSearchInput } from '@openmsupply-client/system';
import {
  InvoiceToolbarCustomFields,
  useCustomFieldsQuickEdit,
} from '../../common';
import { AppRoute } from '@openmsupply-client/config';

export const Toolbar: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { debouncedMutateAsync } = useReturns.document.updateSupplierReturn();

  const { bufferedState, setBufferedState } =
    useReturns.document.supplierReturn();
  const { otherParty, theirReference, customFields, id, originalShipment } =
    bufferedState ?? { id: '' };
  const { mutateAsync: updateOtherParty } =
    useReturns.document.updateOtherParty();

  const update = (data: Partial<SupplierReturnFragment>) => {
    if (!id) return;
    setBufferedState({ ...data });
    debouncedMutateAsync({ id, ...data });
  };

  // Quick-edits need different shapes locally vs on the wire — the whole
  // merged blob for setBufferedState (which replaces top-level keys), the
  // accumulated patch for the server (which merge-patches customFields) — see
  // the hook.
  const updateCustomFields = useCustomFieldsQuickEdit(
    customFields,
    ({ customFields, patch }) => {
      if (!id) return;
      setBufferedState({ customFields });
      debouncedMutateAsync({ id, customFields: patch });
    }
  );

  const isDisabled = useReturns.utils.supplierIsDisabled();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container spacing={2} width="100%" alignItems="flex-start">
        <Grid>
          <Box display="flex" flexDirection="column" gap={1}>
            {otherParty && (
              <InputWithLabelRow
                label={t('label.supplier-name')}
                sx={{ minWidth: 100 }}
                Input={
                  <SupplierSearchInput
                    disabled={isDisabled || !!originalShipment}
                    value={otherParty}
                    onChange={async v => {
                      if (!v) return;
                      const otherPartyId = v.id;
                      const newId = await updateOtherParty({
                        id,
                        otherPartyId,
                      });
                      if (!newId) return;
                      navigate(
                        RouteBuilder.create(AppRoute.Replenishment)
                          .addPart(AppRoute.SupplierReturn)
                          .addPart(newId)
                          .build()
                      );
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.supplier-reference')}
              Input={
                <BasicTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={theirReference ?? ''}
                  onChange={event => {
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
            <DisabledStoreNotice otherParty={otherParty} />
          </Box>
        </Grid>
        <Grid>
          <Box display="flex" flexDirection="column" gap={1}>
            <InvoiceToolbarCustomFields
              invoiceType={InvoiceNodeType.SupplierReturn}
              customFields={customFields}
              onUpdate={updateCustomFields}
              disabled={isDisabled}
            />
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
