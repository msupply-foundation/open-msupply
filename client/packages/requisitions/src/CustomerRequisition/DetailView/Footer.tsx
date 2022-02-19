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
  getRequestRequisitionStatuses,
  getNextRequestRequisitionStatus,
  getRequestRequisitionTranslator,
  createStatusLog,
  getStatusTranslation,
} from '../../utils';
import {
  useResponseRequisitionFields,
  useIsResponseRequisitionDisabled,
} from '../api';

export const Footer: FC = () => {
  const { status, update } = useResponseRequisitionFields('status');
  const isDisabled = useIsResponseRequisitionDisabled();
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
              statuses={getRequestRequisitionStatuses()}
              statusLog={createStatusLog(status)}
              statusFormatter={getRequestRequisitionTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              {!isDisabled && (
                <ButtonWithIcon
                  shrinkThreshold="lg"
                  disabled={isDisabled}
                  Icon={<ArrowRightIcon />}
                  label={t('button.save-and-confirm-status', {
                    status: getStatusTranslation(status),
                  })}
                  sx={{ fontSize: '12px' }}
                  variant="contained"
                  color="secondary"
                  onClick={async () => {
                    const nextStatus = getNextRequestRequisitionStatus(status);
                    if (!nextStatus) return;
                    await update({ status: nextStatus });
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
