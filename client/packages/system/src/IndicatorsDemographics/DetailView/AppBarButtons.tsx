import React from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  PlusCircleIcon,
  RecordPatch,
  useTranslation,
} from '@openmsupply-client/common';
import { Row } from './IndicatorsDemographics';
import { AppBarButtonsPortal, Grid } from '@openmsupply-client/common';

interface IndicatorsAppBarButtonsProps {
  patch: (patch: RecordPatch<Row>) => void;
}

export const AppBarButtonsComponent = ({
  patch,
}: IndicatorsAppBarButtonsProps) => {
  const t = useTranslation();

  const handleClick = () => {
    const id = FnUtils.generateUUID();
    const newRow = {
      id,
      name: '',
      percentage: 0,
      isNew: true,
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    patch({ ...newRow });
  };
  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          onClick={handleClick}
          label={t('button.add-new-indicator')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
