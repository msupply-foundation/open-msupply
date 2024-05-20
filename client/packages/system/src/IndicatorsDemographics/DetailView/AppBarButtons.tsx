import React from 'react';
import {
  CloseIcon,
  FnUtils,
  LoadingButton,
  PlusCircleIcon,
  RecordPatch,
  useTranslation,
} from '@openmsupply-client/common';
import { Row } from './IndicatorsDemographics';
import { AppBarButtonsPortal, Grid } from '@openmsupply-client/common';

interface IndicatorsAppBarButtonsProps {
  rows: Row[];
  patch: (patch: RecordPatch<Row>) => void;
  save: () => void;
  cancel: () => void;
}

export const AppBarButtonsComponent = ({
  patch,
  save,
  cancel,
}: IndicatorsAppBarButtonsProps) => {
  const t = useTranslation('common');
  const handleClick = () => {
    const id = FnUtils.generateUUID();
    patch({
      id,
      name: 'new',
      percentage: 0,
      isNew: true,
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    });
  };
  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
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
        <LoadingButton
          startIcon={<CloseIcon />}
          onClick={cancel}
          isLoading={false}
        >
          {t('button.cancel')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
