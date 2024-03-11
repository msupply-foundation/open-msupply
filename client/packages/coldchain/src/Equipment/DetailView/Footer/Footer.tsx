import React from 'react';
import {
  Box,
  ButtonWithIcon,
  useTranslation,
  AppFooterPortal,
  XCircleIcon,
  useBreadcrumbs,
  DeleteIcon,
  LoadingButton,
  // useAuthContext,
  // UserPermission,
} from '@openmsupply-client/common';

import { useAssets } from '../../api';

interface FooterProps {
  isSaving: boolean;
  isDirty?: boolean;
  showSaveConfirmation: () => void;
}

export const FooterComponent = ({
  isDirty,
  isSaving,
  showSaveConfirmation,
}: FooterProps) => {
  const t = useTranslation('coldchain');
  const { navigateUpOne } = useBreadcrumbs();
  const { data } = useAssets.document.get();
  const onDelete = useAssets.document.delete(data?.id || '');
  // const { userHasPermission } = useAuthContext();

  return (
    <AppFooterPortal
      Content={
        data ? (
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
                Icon={<XCircleIcon />}
                label={t('button.close')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={() => navigateUpOne()}
              />
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<DeleteIcon />}
                label={t('button.delete')}
                color="error"
                sx={{ fontSize: '12px' }}
                onClick={onDelete}
              />
              <LoadingButton
                color="secondary"
                disabled={
                  !isDirty // ||
                  // !userHasPermission(UserPermission.AssetMutate)
                }
                isLoading={isSaving}
                onClick={showSaveConfirmation}
              >
                {t('button.save')}
              </LoadingButton>
            </Box>
          </Box>
        ) : null
      }
    />
  );
};

export const Footer = React.memo(FooterComponent);
