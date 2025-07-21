import React from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  LoadingButton,
  useExportCSV,
} from '@openmsupply-client/common';
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
  const { error } = useNotification();
  const t = useTranslation();
  const exportCSV = useExportCSV();

  const csvExport = async () => {
    if (!locations) {
      error(t('error.no-data'))();
      return;
    }

    const csv = locationsToCsv(locations, t);
    exportCSV(csv, t('filename.locations'));
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-location')}
          onClick={onCreate}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          label={t('button.export')}
          isLoading={reportIsLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
