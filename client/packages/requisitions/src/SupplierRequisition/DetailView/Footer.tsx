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
  useIsRequestRequisitionDisabled,
  useRequestRequisitionFields,
} from '../api';

export const Footer: FC = () => {
  const { status, update } = useRequestRequisitionFields('status');
  const isDisabled = useIsRequestRequisitionDisabled();
  const t = useTranslation('replenishment');
  const { success } = useNotification();

  return (
    <AppFooterPortal
      Content={
        status && (
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
              <>
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
                    success('Saved requisition! 🥳 ')();
                    await update({
                      status: getNextSupplierRequisitionStatus(status),
                    });
                  }}
                />
              </>
            </Box>
          </Box>
        )
      }
    />
  );
};
