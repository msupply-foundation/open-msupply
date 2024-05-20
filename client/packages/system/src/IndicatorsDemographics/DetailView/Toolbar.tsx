import React from 'react';
import { AppBarContentPortal, Box } from '@openmsupply-client/common';

export const Toolbar = () => {
  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Box paddingLeft={4} display="flex" flex={1} alignItems="flex-start">
        {/* <LoadingButton
          startIcon={<PlusCircleIcon />}
          onClick={handleClick}
          isLoading={false}
        >
          {t('button.add-new-indicator')}
        </LoadingButton>
        <LoadingButton
          startIcon={<PlusCircleIcon />}
          onClick={save}
          isLoading={false}
        >
          {t('button.save')}
        </LoadingButton>
        <LoadingButton
          startIcon={<CloseIcon />}
          onClick={cancel}
          isLoading={false}
        >
          {t('button.cancel')}
        </LoadingButton> */}
      </Box>
    </AppBarContentPortal>
  );
};
