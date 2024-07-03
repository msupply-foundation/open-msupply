import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  RecordPatch,
  useCallbackWithPermission,
  UserPermission,
  useTranslation,
} from '@openmsupply-client/common';

import { Row } from '../types';

interface IndicatorsAppBarButtonsProps {
  patch: (patch: RecordPatch<Row>) => void;
  rows: Row[];
}

export const AppBarButtonsComponent = ({
  patch,
  rows,
}: IndicatorsAppBarButtonsProps) => {
  const t = useTranslation();

  const onCreate = () => {
    const id = FnUtils.generateUUID();
    const newRow = {
      id,
      name: '',
      percentage: 0,
      isNew: true,
      baseYear: rows[0]?.baseYear ?? 0,
      BasePopulation: rows[0]?.basePopulation ?? 0,
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    patch({ ...newRow });
  };

  const handleClick = useCallbackWithPermission(
    UserPermission.EditCentralData,
    onCreate
  );

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
