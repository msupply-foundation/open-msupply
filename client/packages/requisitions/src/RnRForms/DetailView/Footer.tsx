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
  useKeyboard,
} from '@openmsupply-client/common';
import { RnRFormQuery, useRnRForm, useRnRFormContext } from '../api';
import { useSaveAllLines } from './AutoSave';

export const Footer = ({ data }: { data: RnRFormQuery }) => {
  const saveAllLines = useSaveAllLines();
  const { keyboardIsOpen } = useKeyboard();
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();
  const { error, success } = useNotification();
  const {
    finalise: { finalise, isFinalising },
  } = useRnRForm({ rnrFormId: data.id });

  const { hasUnconfirmedLines, confirmUnconfirmedLines } = useRnRFormContext(
    ({ hasUnconfirmedLines, confirmUnconfirmedLines }) => ({
      hasUnconfirmedLines,
      confirmUnconfirmedLines,
    })
  );

  const showFinaliseConfirmation = useConfirmationModal({
    onConfirm: async () => {
      try {
        if (hasUnconfirmedLines()) {
          confirmUnconfirmedLines();
          await saveAllLines();
        }
        await finalise();
        success(t('label.finalised'))();
      } catch (e) {
        error((e as Error).message)();
      }
    },
    message: hasUnconfirmedLines()
      ? `${t('messages.rnr-not-all-lines-confirmed')}\n${t('messages.confirm-finalise-rnr')}`
      : t('messages.confirm-finalise-rnr'),
    title: t('heading.are-you-sure'),
  });

  const showFooter = !keyboardIsOpen;

  return (
    <AppFooterPortal
      Content={
        showFooter &&
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
