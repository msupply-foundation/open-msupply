import {
  Box,
  StatusCrumbs,
  AppFooterPortal,
  RequisitionNodeStatus,
  useTranslation,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { getRequisitionTranslator, requestStatuses } from '../../../utils';
import { RequestFragment, useRequest } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

export const createStatusLog = (requisition: RequestFragment) => {
  const statusLog: Record<RequisitionNodeStatus, null | undefined | string> = {
    [RequisitionNodeStatus.Draft]: requisition.createdDatetime,
    [RequisitionNodeStatus.Sent]: requisition.sentDatetime,
    [RequisitionNodeStatus.Finalised]: requisition.finalisedDatetime,
    // Keeping typescript happy, not used for request requisitions.
    [RequisitionNodeStatus.New]: null,
  };

  return statusLog;
};

export const Footer: FC = () => {
  const { data } = useRequest.document.get();
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
              statuses={requestStatuses}
              statusLog={createStatusLog(data)}
              statusFormatter={getRequisitionTranslator(t)}
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
