import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FnUtils,
  LoadingButton,
  PlusCircleIcon,
  RecordPatch,
  useTranslation,
} from '@openmsupply-client/common';
import { Row } from './IndicatorsDemographics';

interface IndicatorsTableProps {
  rows: Row[];
  patch: (patch: RecordPatch<Row>) => void;
  save: () => void;
}

export const Toolbar = ({ patch, save }: IndicatorsTableProps) => {
  const t = useTranslation('common');

  const handleClick = () => {
    const id = FnUtils.generateUUID();
    patch({
      id,
      name: 'new',
      percentage: 0,
      year: 0,
      year1: 0,
      year2: 0,
      year3: 0,
      year4: 0,
      year5: 0,
      isNew: true,
    });
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
