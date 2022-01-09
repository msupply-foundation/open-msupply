import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  StatusCrumbs,
  useTranslation,
  useNotification,
  AppFooterPortal,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getSupplierRequisitionStatuses,
  getNextSupplierRequisitionStatus,
  getSupplierRequisitionTranslator,
  createStatusLog,
  getNextStatusText,
} from '../../utils';
import {
  useCustomerRequisitionFields,
  useIsCustomerRequisitionDisabled,
} from '../api';

export const Footer: FC = () => {
  const { status, update } = useCustomerRequisitionFields('status');
  const isDisabled = useIsCustomerRequisitionDisabled();
  const t = useTranslation('distribution');
  const { success } = useNotification();

  return (
    <AppFooterPortal
      Content={
        status ? (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <StatusCrumbs
              statuses={getSupplierRequisitionStatuses()}
              statusLog={createStatusLog(status)}
              statusFormatter={getSupplierRequisitionTranslator()}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              {!isDisabled && (
                <ButtonWithIcon
                  shrinkThreshold="lg"
                  disabled={isDisabled}
                  Icon={<ArrowRightIcon />}
                  label={t('button.save-and-confirm-status', {
                    status: getNextStatusText(status),
                  })}
                  sx={{ fontSize: '12px' }}
                  variant="contained"
                  color="secondary"
                  onClick={async () => {
                    await update({
                      status: getNextSupplierRequisitionStatus(status),
                    });
                    success('Saved requisition! 🥳 ')();
                  }}
                />
              )}
            </Box>
          </Box>
        ) : null
      }
    />
  );
};
