import React, { FC } from 'react';
import {
  Box,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  RequisitionNodeStatus,
} from '@openmsupply-client/common';
import { responseStatuses, getRequisitionTranslator } from '../../../utils';
import { ResponseFragment, useResponse } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { CreateShipmentButton } from './CreateShipmentButton';

export const createStatusLog = (requisition: ResponseFragment) => {
  const statusLog: Record<RequisitionNodeStatus, null | undefined | string> = {
    [RequisitionNodeStatus.New]: requisition.createdDatetime,
    [RequisitionNodeStatus.Finalised]: requisition.finalisedDatetime,
    // Keeping typescript happy, not used for response requisitions.
    [RequisitionNodeStatus.Draft]: null,
    [RequisitionNodeStatus.Sent]: null,
  };

  return statusLog;
};

export const Footer: FC = () => {
  const { data } = useResponse.document.get();
  const t = useTranslation('distribution');

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
              statuses={responseStatuses}
              statusLog={createStatusLog(data)}
              statusFormatter={getRequisitionTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <CreateShipmentButton />
              <StatusChangeButton requisition={data} />
            </Box>
          </Box>
        )
      }
    />
  );
};
