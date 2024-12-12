import React, { FC, memo } from 'react';
import {
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  XCircleIcon,
  useTranslation,
  AppFooterPortal,
  InvoiceNodeStatus,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { getStatusTranslator, prescriptionStatuses } from '../../../utils';
import { StatusChangeButton } from './StatusChangeButton';
import { PrescriptionRowFragment, usePrescription } from '../../api';

const createStatusLog = (invoice: PrescriptionRowFragment) => {
  const statusIdx = prescriptionStatuses.findIndex(s => invoice.status === s);

  const statusLog: Record<InvoiceNodeStatus, null | undefined | string> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Verified]: null,
    // placeholder not used in prescriptions
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
  };

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = invoice.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.pickedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }

  return statusLog;
};

export const FooterComponent: FC = () => {
  const t = useTranslation();
  const {
    query: { data },
  } = usePrescription();
  const { navigateUpOne } = useBreadcrumbs();

  return (
    <AppFooterPortal
      Content={
        data?.id && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <StatusCrumbs
              statuses={prescriptionStatuses}
              statusLog={createStatusLog(data)}
              statusFormatter={getStatusTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<XCircleIcon />}
                label={t('button.close')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={() => navigateUpOne()}
              />

              <StatusChangeButton />
            </Box>
          </Box>
        )
      }
    />
  );
};

export const Footer = memo(FooterComponent);
