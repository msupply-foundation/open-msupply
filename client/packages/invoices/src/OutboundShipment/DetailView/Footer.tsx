import React, { FC } from 'react';
import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  StatusCrumbs,
  ToggleButton,
  XCircleIcon,
  useTranslation,
  useNotification,
  AppFooterPortal,
  InvoiceNodeStatus,
  useNavigate,
  useBufferState,
} from '@openmsupply-client/common';
import {
  getNextOutboundStatus,
  getNextOutboundStatusButtonTranslation,
  getStatusTranslator,
  outboundStatuses,
} from '../../utils';
import { useIsOutboundDisabled, useOutbound, useOutboundFields } from '../api';
import { Invoice } from '../../types';

const createStatusLog = (invoice: Invoice) => {
  const statusIdx = outboundStatuses.findIndex(s => invoice.status === s);

  const statusLog: Record<InvoiceNodeStatus, null | undefined | string> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Verified]: null,
  };

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = invoice.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Allocated] = invoice.allocatedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.pickedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Shipped] = invoice.shippedDatetime;
  }
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Delivered] = invoice.deliveredDatetime;
  }
  if (statusIdx >= 5) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }

  return statusLog;
};

export const Footer: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation('distribution');
  const { success } = useNotification();

  const { data } = useOutbound();
  const isDisabled = useIsOutboundDisabled();
  const { onHold, status, update } = useOutboundFields(['onHold', 'status']);
  const [onHoldBuffer, setOnHoldBuffer] = useBufferState(onHold);

  return (
    <AppFooterPortal
      Content={
        data && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <ToggleButton
              disabled={isDisabled}
              value={!!onHoldBuffer}
              selected={!!onHoldBuffer}
              onClick={(_, value) => {
                setOnHoldBuffer(!value);
                update({ onHold: !value });
              }}
              label={t('label.hold')}
            />

            <StatusCrumbs
              statuses={outboundStatuses}
              statusLog={createStatusLog(data)}
              statusFormatter={getStatusTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<XCircleIcon />}
                label={t('button.cancel')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={() => navigate(-1)}
              />

              {!isDisabled && (
                <ButtonWithIcon
                  shrinkThreshold="lg"
                  disabled={!!onHold}
                  Icon={<ArrowRightIcon />}
                  label={t('button.save-and-confirm-status', {
                    status: t(getNextOutboundStatusButtonTranslation(status)),
                  })}
                  sx={{ fontSize: '12px' }}
                  variant="contained"
                  color="secondary"
                  onClick={async () => {
                    await update({ status: getNextOutboundStatus(status) });
                    success('Saved invoice! 🥳 ')();
                  }}
                />
              )}
            </Box>
          </Box>
        )
      }
    />
  );
};
