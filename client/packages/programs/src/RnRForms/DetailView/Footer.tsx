import React from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  useBreadcrumbs,
  useTranslation,
  RnRFormNodeStatus,
} from '@openmsupply-client/common';
import { useRnRForm } from '../../api';

export const Footer = ({ rnrFormId }: { rnrFormId: string }) => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();
  const {
    query: { data },
    finalise: { finalise, isFinalising },
  } = useRnRForm({ rnrFormId });

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
                // TODO: confirmation modal,
                // disable finalise when dirty fields
                disabled={
                  isFinalising || data.status === RnRFormNodeStatus.Finalised
                }
                onClick={() => finalise()}
                variant={'ok'}
                customLabel={t('label.finalise')}
              />
            </Box>
          </Box>
        )
      }
    />
  );
};
