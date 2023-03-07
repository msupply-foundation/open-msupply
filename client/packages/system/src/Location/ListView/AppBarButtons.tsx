import React, { FC } from 'react';

import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FileUtils,
  SortBy,
  LoadingButton,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocation } from '..';
import { locationsToCsv } from '../../utils';

interface AppBarButtonsProps {
  onCreate: () => void;
  sortBy: SortBy<LocationRowFragment>;
}

export const AppBarButtons: FC<AppBarButtonsProps> = ({ onCreate, sortBy }) => {
  const { success, error } = useNotification();
  const t = useTranslation('inventory');
  const { isLoading, fetchAsync } = useLocation.document.listAll(sortBy);

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = locationsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.locations'));
    success(t('success'))();
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
          isLoading={isLoading}
          onClick={csvExport}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};
