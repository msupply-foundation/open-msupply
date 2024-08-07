import React from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  useBreadcrumbs,
  useTranslation,
  RnRFormNodeStatus,
  useNotification,
} from '@openmsupply-client/common';
import { useRnRForm } from '../api';

export const Footer = ({
  rnrFormId,
  linesUnconfirmed,
}: {
  rnrFormId: string;
  linesUnconfirmed: boolean;
}) => {
  const t = useTranslation('programs');
  const { navigateUpOne } = useBreadcrumbs();
  const { error, info, success } = useNotification();
  const {
    query: { data },
    finalise: { finalise, isFinalising },
  } = useRnRForm({ rnrFormId });

  const onFinalise = async () => {
    if (linesUnconfirmed) {
      info(t('messages.all-lines-must-be-confirmed'))();
      return;
    }
    try {
      await finalise();
      success(t('label.finalised'))();
    } catch (e) {
      error((e as Error).message)();
    }
  };

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
              <DialogButton
                onClick={() => navigateUpOne()}
                variant={'cancel'}
              />
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
