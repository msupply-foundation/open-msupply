import React, { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
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
  unsavedChanges,
}: {
  rnrFormId: string;
  linesUnconfirmed: boolean;
  unsavedChanges: boolean;
}) => {
  const [showFooter, setShowFooter] = useState(true);
  const t = useTranslation('replenishment');
  const { navigateUpOne } = useBreadcrumbs();
  const { error, info, success } = useNotification();
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

  const onFinalise = async () => {
    if (unsavedChanges) {
      info(t('messages.all-changes-must-be-confirmed'))();
      return;
    }
    showFinaliseConfirmation();
  };

  // Hide while keyboard is open fora bit more screen real estate
  useEffect(() => {
    if (!Capacitor.isPluginAvailable('Keyboard')) return;

    Keyboard.addListener('keyboardDidShow', () => {
      setShowFooter(false);
    });
    Keyboard.addListener('keyboardDidHide', () => {
      setShowFooter(true);
    });

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

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
                onClick={onFinalise}
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
