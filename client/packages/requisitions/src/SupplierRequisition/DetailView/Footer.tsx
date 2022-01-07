import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  StatusCrumbs,
  XCircleIcon,
  useTranslation,
  useNotification,
  AppFooterPortal,
  useNavigate,
  SupplierRequisitionNodeStatus,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getSupplierRequisitionStatuses,
  getNextSupplierRequisitionStatus,
  getSupplierRequisitionTranslator,
} from '../../utils';
import {
  useIsSupplierRequisitionDisabled,
  useSupplierRequisitionFields,
} from '../api';

const getNextStatusText = (status: SupplierRequisitionNodeStatus) => {
  const nextStatus = getNextSupplierRequisitionStatus(status);
  const translation = getSupplierRequisitionTranslator()(nextStatus);
  return translation;
};

const createStatusLog = (
  status: 'DRAFT' | 'IN_PROGRESS' | 'FINALISED' | 'SENT'
) => {
  if (status === 'DRAFT') {
    return {
      DRAFT: new Date().toISOString(),
      IN_PROGRESS: null,
      FINALISED: null,
      SENT: null,
    };
  }
  if (status === 'IN_PROGRESS') {
    return {
      DRAFT: new Date().toISOString(),
      IN_PROGRESS: new Date().toISOString(),
      FINALISED: null,
      SENT: null,
    };
  }

  if (status === 'FINALISED') {
    return {
      DRAFT: new Date().toISOString(),
      IN_PROGRESS: new Date().toISOString(),
      FINALISED: new Date().toISOString(),
      SENT: null,
    };
  }

  return {
    DRAFT: new Date().toISOString(),
    IN_PROGRESS: new Date().toISOString(),
    FINALISED: new Date().toISOString(),
    SENT: new Date().toISOString(),
  };
};

export const Footer: FC = () => {
  const { status, update } = useSupplierRequisitionFields('status');
  const isDisabled = useIsSupplierRequisitionDisabled();
  const navigate = useNavigate();
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
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<XCircleIcon />}
                label={t('button.cancel')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={() => navigate(-1)}
              />
              {!isDisabled && (
                <>
                  <ButtonWithIcon
                    shrinkThreshold="lg"
                    // disabled={draft.onHold}
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
              )}
            </Box>
          </Box>
        )
      }
    />
  );
};
