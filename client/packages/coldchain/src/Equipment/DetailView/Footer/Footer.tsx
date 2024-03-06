import React, { FC } from 'react';
import {
  Box,
  ButtonWithIcon,
  useTranslation,
  AppFooterPortal,
  XCircleIcon,
  useBreadcrumbs,
} from '@openmsupply-client/common';

import { useAssets } from '../../api';

export const FooterComponent: FC = () => {
  const t = useTranslation('coldchain');
  const { navigateUpOne } = useBreadcrumbs();
  const { data } = useAssets.document.get();

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
            </Box>
          </Box>
        ) : null
      }
    />
  );
};

export const Footer = React.memo(FooterComponent);
