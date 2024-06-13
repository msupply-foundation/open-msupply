import React from 'react';
import {
  Box,
  ButtonWithIcon,
  useTranslation,
  AppFooterPortal,
  LoadingButton,
  useNotification,
} from '@openmsupply-client/common';
import { CloseIcon, SaveIcon } from '@common/icons';

interface VaccineCoursesFooterProps {
  isDirty: boolean;
  cancel: () => void;
  save: () => void;
  isLoading: boolean;
}

export const AppFooterComponent = ({
  isDirty,
  save,
  cancel,
  isLoading,
}: VaccineCoursesFooterProps) => {
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();

  const onSave = async () => {
    try {
      await save();
      success(t('messages.vaccine-course-saved'));
    } catch (e) {
      error(t('error.vaccine-course-update-failed'));
    }
  };

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
          <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
            <ButtonWithIcon
              shrinkThreshold="lg"
              Icon={<CloseIcon />}
              label={t('button.close')}
              color="secondary"
              sx={{ fontSize: '12px' }}
              onClick={cancel}
            />

            <LoadingButton
              isLoading={isLoading}
              disabled={!isDirty}
              onClick={onSave}
              startIcon={<SaveIcon />}
              sx={{ fontSize: '12px' }}
            >
              {t('button.save')}
            </LoadingButton>
          </Box>
        </Box>
      }
    />
  );
};
