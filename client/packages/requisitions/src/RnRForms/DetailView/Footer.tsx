import React from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  useBreadcrumbs,
  useTranslation,
  RnRFormNodeStatus,
  useNotification,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useRnRForm } from '../api';

export const Footer = ({
  rnrFormId,
  linesUnconfirmed,
}: {
  rnrFormId: string;
  linesUnconfirmed: boolean;
}) => {
  const t = useTranslation('replenishment');
  const { navigateUpOne } = useBreadcrumbs();
  const { error, success } = useNotification();
  const {
    query: { data },
    finalise: { finalise, isFinalising },
    confirmRemainingLines,
  } = useRnRForm({ rnrFormId });

  const showFinaliseConfirmation = useConfirmationModal({
    onConfirm: async () => {
      try {
        if (linesUnconfirmed) {
          await confirmRemainingLines();
        }
        await finalise();
        success(t('label.finalised'))();
      } catch (e) {
        error((e as Error).message)();
      }
    },
    message: linesUnconfirmed
      ? `${t('messages.rnr-not-all-lines-confirmed')}\n${t('messages.confirm-finalise-rnr')}`
      : t('messages.confirm-finalise-rnr'),
    title: t('heading.are-you-sure'),
  });

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
            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <DialogButton onClick={() => navigateUpOne()} variant={'close'} />
              <DialogButton
                disabled={
                  isFinalising || data.status === RnRFormNodeStatus.Finalised
                }
                onClick={() => showFinaliseConfirmation()}
                variant={'ok'}
                customLabel={
                  data.status === RnRFormNodeStatus.Finalised
                    ? t('label.finalised')
                    : t('label.finalise')
                }
              />
            </Box>
          </Box>
        )
      }
    />
  );
};
