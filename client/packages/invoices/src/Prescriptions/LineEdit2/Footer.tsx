import React, { FC } from 'react';
import {
  Box,
  AppFooterPortal,
  LoadingButton,
  useTranslation,
  SaveIcon,
} from '@openmsupply-client/common';

interface FooterProps {
  isSaving: boolean;
  disabled: boolean;
  handleSave: () => Promise<boolean | void>;
}

export const Footer: FC<FooterProps> = ({ isSaving, disabled, handleSave }) => {
  const t = useTranslation();
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
            <LoadingButton
              color="secondary"
              variant="contained"
              startIcon={<SaveIcon />}
              isLoading={isSaving}
              label={t('button.save')}
              onClick={handleSave}
              disabled={!disabled}
            />
          </Box>
        </Box>
      }
    />
  );
};
