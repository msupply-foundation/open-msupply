import React from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  InvoiceNodeType,
  useTranslation,
  useBufferState,
  Tooltip,
  useNavigate,
  RouteBuilder,
  DisabledStoreNotice,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '@openmsupply-client/system';
import { useOutbound } from '../api';
import { InvoiceToolbarCustomFields } from '../../common';
import { AppRoute } from '@openmsupply-client/config';

export const Toolbar = () => {
  const t = useTranslation();
  const { id, otherParty, theirReference, customFields, update, requisition } =
    useOutbound.document.fields([
      'id',
      'otherParty',
      'theirReference',
      'customFields',
      'requisition',
    ]);
  const [theirReferenceBuffer, setTheirReferenceBuffer] =
    useBufferState(theirReference);
  const navigate = useNavigate();
  const { mutateAsync: updateName } = useOutbound.document.updateName();

  const isDisabled = useOutbound.utils.isDisabled();

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        marginY: 1,
        gap: 3,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
      }}
    >
      {otherParty && (
        <InputWithLabelRow
          label={t('label.customer-name')}
          sx={{ minWidth: 100 }}
          Input={
            <CustomerSearchInput
              disabled={isDisabled || !!requisition}
              value={otherParty}
              onChange={async v => {
                if (!v) return;
                const otherPartyId = v.id;
                const newId = await updateName({ id, otherPartyId });
                // When changing customer name, the whole invoice is
                // deleted and re-created, so we'll need to re-direct to
                // the new ID
                navigate(
                  RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.OutboundShipment)
                    .addPart(newId)
                    .build(),
                  { replace: true }
                );
              }}
              width={250}
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
      <Box display="flex" flexDirection="column" gap={1}>
        <InvoiceToolbarCustomFields
          invoiceType={InvoiceNodeType.OutboundShipment}
          customFields={customFields}
          onUpdate={patch => update({ customFields: patch })}
          disabled={isDisabled}
        />
      </Box>
      <DisabledStoreNotice otherParty={otherParty} />
    </AppBarContentPortal>
  );
};
