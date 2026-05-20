import React from 'react';
import {
  AppFooterPortal,
  Box,
  DialogButton,
  LoadingButton,
  SaveIcon,
  useBreadcrumbs,
  useTranslation,
} from '@openmsupply-client/common';

interface FooterProps {
  isSaving: boolean;
  isDirty: boolean;
  disabled?: boolean;
  onSave: () => void;
}

export const Footer = ({ isSaving, isDirty, disabled, onSave }: FooterProps) => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();

  return (
    <AppFooterPortal
      Content={
        <Box
          gap={2}
          display="flex"
          flexDirection="row"
          alignItems="center"
          height={64}
        >
          <Box
            flex={1}
            display="flex"
            justifyContent="flex-end"
            gap={2}
            marginLeft="auto"
          >
            <DialogButton
              variant={isDirty ? 'cancel' : 'close'}
              onClick={() => navigateUpOne()}
              shouldShrink={false}
            />
            <LoadingButton
              color="secondary"
              disabled={disabled}
              isLoading={isSaving}
              onClick={onSave}
              label={t('button.save')}
              startIcon={<SaveIcon />}
              shouldShrink={false}
            />
          </Box>
        </Box>
      }
    />
  );
};
