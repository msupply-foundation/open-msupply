import React from 'react';
import {
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { LocationRowFragment } from '..';
import { locationsToCsv } from '../../utils';

interface AppBarButtonsProps {
  onCreate: () => void;
  locations?: LocationRowFragment[];
  reportIsLoading: boolean;
}

export const AppBarButtons = ({
  onCreate,
  locations,
  reportIsLoading,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const getCsvData = () => {
    if (!locations) {
      error(t('error.no-data'))();
      return null;
    }
    return locationsToCsv(locations, t);
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-location')}
          onClick={onCreate}
        />
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.locations')}
          isLoading={reportIsLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
