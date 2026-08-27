import React from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  InlineSpinner,
} from '@openmsupply-client/common';

interface FooterProps {
  isSaving: boolean;
  disabled: boolean;
  handleSave: () => Promise<boolean | void>;
  handleCancel: () => void;
}

export const Footer = ({
  isSaving,
  disabled,
  handleSave,
  handleCancel,
}: FooterProps) => (
  <AppFooterPortal
    Content={
      isSaving ? (
        <InlineSpinner />
      ) : (
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
            <DialogButton variant="cancel" onClick={handleCancel} />
            <DialogButton
              variant={'save'}
              disabled={disabled}
              onClick={handleSave}
            />
          </Box>
        </Box>
      )
    }
  />
);
