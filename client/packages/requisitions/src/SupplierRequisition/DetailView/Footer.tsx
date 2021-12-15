import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  SaveIcon,
  StatusCrumbs,
  XCircleIcon,
  useTranslation,
  useNotification,
  AppFooterPortal,
  useNavigate,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getSupplierRequisitionStatuses,
  getNextSupplierRequisitionStatus,
  getSupplierRequisitionTranslator,
  isRequisitionEditable,
} from '../../utils';
import { SupplierRequisition } from '../../types';

interface OutboundDetailFooterProps {
  draft: SupplierRequisition;
  save: () => Promise<void>;
}

const getNextStatusText = (draft: SupplierRequisition) => {
  const nextStatus = getNextSupplierRequisitionStatus(draft.status);
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

export const Footer: FC<OutboundDetailFooterProps> = ({ draft, save }) => {
  const navigate = useNavigate();
  const t = useTranslation('common');
  const { success } = useNotification();

  return (
    <AppFooterPortal
      Content={
        draft && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <StatusCrumbs
              statuses={getSupplierRequisitionStatuses()}
              statusLog={createStatusLog(draft.status)}
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
              {isRequisitionEditable(draft) && (
                <>
                  <ButtonWithIcon
                    shrinkThreshold="lg"
                    Icon={<SaveIcon />}
                    label={t('button.save')}
                    variant="contained"
                    color="secondary"
                    sx={{ fontSize: '12px' }}
                    onClick={() => {
                      success('Saved invoice! 🥳 ')();
                      save();
                    }}
                  />
                  <ButtonWithIcon
                    shrinkThreshold="lg"
                    // disabled={draft.onHold}
                    Icon={<ArrowRightIcon />}
                    label={t('button.save-and-confirm-status', {
                      status: getNextStatusText(draft),
                    })}
                    sx={{ fontSize: '12px' }}
                    variant="contained"
                    color="secondary"
                    onClick={async () => {
                      success('Saved requisition! 🥳 ')();
                      await draft.update?.(
                        'status',
                        getNextSupplierRequisitionStatus(draft.status)
                      );

                      save();
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
