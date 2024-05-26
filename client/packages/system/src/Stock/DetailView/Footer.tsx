import React, { FC } from 'react';
import {
  Box,
  useTranslation,
  AppFooterPortal,
  DialogButton,
  LoadingButton,
} from '@openmsupply-client/common';
import { FormInputData } from '@openmsupply-client/programs';

interface FooterProps {
  isSaving: boolean;
  isDirty?: boolean;
  validationError?: string | boolean;
  inputData?: FormInputData;
  showSaveConfirmation: () => void;
  showCancelConfirmation: () => void;
}

export const Footer: FC<FooterProps> = ({
  isSaving,
  isDirty,
  inputData,
  showSaveConfirmation,
  showCancelConfirmation,
}) => {
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
            <DialogButton
              variant="cancel"
              disabled={!isDirty}
              onClick={() => showCancelConfirmation()}
            />
            <LoadingButton
              color="secondary"
              disabled={!isDirty}
              isLoading={isSaving}
              onClick={showSaveConfirmation}
            >
              {inputData?.isCreating ? t('button.create') : t('button.save')}
            </LoadingButton>
          </Box>
        </Box>
      }
    />
  );
};
