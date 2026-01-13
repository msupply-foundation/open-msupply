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
import {
  RnRFormQuery,
  useErrorLineIndex,
  useRnRForm,
  useRnRFormContext,
} from '../api';
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

  const errorLineIndex = useRnRFormContext(useErrorLineIndex);
  const scrollToIndex = useRnRFormContext(state => state.scrollToIndex);

  const showFinaliseConfirmation = useConfirmationModal({
    onConfirm: async () => {
      try {
        if (errorLineIndex != -1) {
          scrollToIndex(errorLineIndex);
        } else {
          await saveAllLines();
          await finalise();
          success(t('status.finalised'))();
        }
      } catch (e) {
        error((e as Error).message)();
      }
    },
    message:
      errorLineIndex != -1
        ? t('error.rnr-has-errors')
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
                    ? t('status.finalised')
                    : t('status.finalise')
                }
              />
            </Box>
          </Box>
        )
      }
    />
  );
};
