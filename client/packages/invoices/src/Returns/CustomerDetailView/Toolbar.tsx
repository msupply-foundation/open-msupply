import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  InvoiceNodeType,
  useTranslation,
  Alert,
  InvoiceNodeStatus,
  DisabledStoreNotice,
} from '@openmsupply-client/common';
import { CustomerReturnFragment, useReturns } from '../api';
import { CustomerSearchInput } from '@openmsupply-client/system';
import {
  InvoiceToolbarCustomFields,
  useCustomFieldsQuickEdit,
} from '../../common';

export const Toolbar: FC = () => {
  const t = useTranslation();
  const isDisabled = useReturns.utils.customerIsDisabled();

  const { draft, setDraft } = useReturns.document.customerReturn();
  const {
    otherParty,
    theirReference,
    customFields,
    id,
    linkedShipment = '',
  } = draft ?? { id: '' };

  const { debouncedMutateAsync } = useReturns.document.updateCustomerReturn();

  const update = (data: Partial<CustomerReturnFragment>) => {
    if (!id) return;
    setDraft({ ...data });
    debouncedMutateAsync({ id, ...data });
  };

  // Quick-edits need different shapes locally vs on the wire — the whole
  // merged blob for setDraft (which replaces top-level keys), the accumulated
  // patch for the server (which merge-patches customFields) — see the hook.
  const updateCustomFields = useCustomFieldsQuickEdit(
    customFields,
    ({ customFields, patch }) => {
      if (!id) return;
      setDraft({ customFields });
      debouncedMutateAsync({ id, customFields: patch });
    }
  );

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container spacing={2} width="100%" alignItems="flex-start">
        <Grid>
          <Box display="flex" flexDirection="column" gap={1}>
            {otherParty && (
              <InputWithLabelRow
                label={t('label.customer-name')}
                Input={
                  <CustomerSearchInput
                    disabled={isDisabled || !!linkedShipment}
                    value={otherParty}
                    onChange={name => {
                      update({ otherPartyId: name?.id });
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
                  value={theirReference ?? ''}
                  onChange={event => {
                    update({ theirReference: event.target.value });
                  }}
                />
              }
            />
          </Box>
        </Grid>
        <Grid>
          <Box display="flex" flexDirection="column" gap={1}>
            <InvoiceToolbarCustomFields
              invoiceType={InvoiceNodeType.CustomerReturn}
              customFields={customFields}
              onUpdate={updateCustomFields}
              disabled={isDisabled}
            />
          </Box>
        </Grid>
        <Grid size={12}>
          <DisabledStoreNotice otherParty={otherParty} />
          <InfoAlert customerReturn={draft} />
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
  const t = useTranslation();
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
