import {
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  ToggleButton,
  useTranslation,
  AppFooterPortal,
  InvoiceNodeStatus,
  useBufferState,
  useNavigate,
  XCircleIcon,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { getStatusTranslator, inboundStatuses } from '../../../utils';
import {
  InboundFragment,
  useInbound,
  useInboundFields,
  useIsInboundDisabled,
} from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

const createStatusLog = (invoice: InboundFragment) => {
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
    statusLog[InvoiceNodeStatus.Delivered] = invoice.deliveredDatetime;
  }
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }

  return statusLog;
};

export const Footer: FC = () => {
  const t = useTranslation('replenishment');
  const navigate = useNavigate();
  const { onHold, update } = useInboundFields('onHold');
  const isDisabled = useIsInboundDisabled();
  const { data } = useInbound();
  const [onHoldBuffer, setOnHoldBuffer] = useBufferState(onHold);

  return (
    <AppFooterPortal
      Content={
        !!data && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <ToggleButton
              disabled={isDisabled}
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

              <StatusChangeButton />
            </Box>
          </Box>
        )
      }
    />
  );
};
