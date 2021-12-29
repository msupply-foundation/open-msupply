import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  StatusCrumbs,
  ToggleButton,
  useTranslation,
  useNotification,
  AppFooterPortal,
  InvoiceNodeStatus,
  useBufferState,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getNextInboundStatusButtonTranslation,
  getStatusTranslator,
  inboundStatuses,
} from '../../utils';
import { Invoice } from '../../types';
import {
  useInboundShipment,
  useInboundFields,
  useIsInboundEditable,
} from './api';

const createStatusLog = (invoice: Invoice) => {
  const statusIdx = inboundStatuses.findIndex(s => invoice.status === s);
  const statusLog: Record<InvoiceNodeStatus, null | string | undefined> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Verified]: null,
    // Placeholder for typescript, not used in inbounds
    [InvoiceNodeStatus.Allocated]: null,
  };

  statusLog;

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = invoice.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.pickedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Shipped] = invoice.shippedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.deliveredDatetime;
  }
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.verifiedDatetime;
  }

  return statusLog;
};

export const Footer: FC = () => {
  const t = useTranslation('replenishment');
  const { success } = useNotification();
  const { onHold, status, update } = useInboundFields(['onHold', 'status']);
  const isEditable = useIsInboundEditable();
  const { data: inbound } = useInboundShipment();
  const [onHoldBuffer, setOnHoldBuffer] = useBufferState(onHold);

  return (
    <AppFooterPortal
      Content={
        !!status &&
        !!inbound && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <ToggleButton
              disabled={!isEditable}
              value={onHoldBuffer}
              selected={onHoldBuffer}
              onClick={(_, value) => {
                setOnHoldBuffer(!value);
                update({ onHold: !value });
              }}
              label={t('label.hold')}
            />

            <StatusCrumbs
              statuses={inboundStatuses}
              statusLog={createStatusLog(inbound)}
              statusFormatter={getStatusTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              {isEditable && (
                <>
                  <ButtonWithIcon
                    shrinkThreshold="lg"
                    disabled={onHoldBuffer}
                    Icon={<ArrowRightIcon />}
                    label={t('button.save-and-confirm-status', {
                      status: t(getNextInboundStatusButtonTranslation(status)),
                    })}
                    sx={{ fontSize: '12px' }}
                    variant="contained"
                    color="secondary"
                    onClick={async () => {
                      update(
                        {
                          onHold: onHoldBuffer,
                          status: InvoiceNodeStatus.Verified,
                        },
                        {
                          onSuccess: success('Saved invoice! 🥳'),
                        }
                      );
                    }}
                  />
                </>
              )}
            </Box>
          </Box>
        )
      }
    />
  );
};
