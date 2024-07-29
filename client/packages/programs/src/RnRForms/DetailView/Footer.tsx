import React, { FC } from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  useBreadcrumbs,
} from '@openmsupply-client/common';

export const Footer: FC = () => {
  // const { data } = useResponse.document.get();
  const { navigateUpOne } = useBreadcrumbs();
  const data = {};

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
              <DialogButton onClick={() => {}} variant={'ok'} />
            </Box>
          </Box>
        )
      }
    />
  );
};
