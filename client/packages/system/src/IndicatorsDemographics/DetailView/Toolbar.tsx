import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  FnUtils,
  LoadingButton,
  PlusCircleIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { IndicatorsTableProps } from './IndicatorsDemographics';

export const Toolbar: FC<IndicatorsTableProps> = props => {
  const { setRows, save } = props;
  const t = useTranslation('common');

  const handleClick = () => {
    const id = FnUtils.generateUUID();
    setRows(oldRows => [
      ...oldRows,
      {
        id,
        name: 'new',
        percentage: 0,
        year: 0,
        year1: 0,
        isNew: true,
      },
    ]);
  };
  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Box paddingLeft={4} display="flex" flex={1} alignItems="flex-start">
        <LoadingButton
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
      </Box>
    </AppBarContentPortal>
  );
};
