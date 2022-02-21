import {
  Box,
  StatusCrumbs,
  AppFooterPortal,
  RequisitionNodeStatus,
  useTranslation,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getRequestRequisitionTranslator,
  requestRequisitionStatuses,
} from '../../../utils';
import { RequestRequisitionFragment, useRequestRequisition } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

export const createStatusLog = (requisition: RequestRequisitionFragment) => {
  const statusIdx = requestRequisitionStatuses.findIndex(
    s => requisition.status === s
  );
  const statusLog: Record<RequisitionNodeStatus, null | undefined | string> = {
    [RequisitionNodeStatus.Draft]: null,
    [RequisitionNodeStatus.Sent]: null,
    [RequisitionNodeStatus.Finalised]: null,

    // Keeping typescript happy, not used for request requisitions.
    [RequisitionNodeStatus.New]: null,
  };

  if (statusIdx >= 0) {
    statusLog[RequisitionNodeStatus.Draft] = requisition.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[RequisitionNodeStatus.Sent] = requisition.sentDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[RequisitionNodeStatus.Finalised] = requisition.finalisedDatetime;
  }

  return statusLog;
};

export const Footer: FC = () => {
  const { data } = useRequestRequisition();
  const t = useTranslation('replenishment');

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
            <StatusCrumbs
              statuses={requestRequisitionStatuses}
              statusLog={createStatusLog(data)}
              statusFormatter={getRequestRequisitionTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <StatusChangeButton />
            </Box>
          </Box>
        )
      }
    />
  );
};
