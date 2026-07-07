import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  SortBy,
  useTranslation,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { LocationRowFragment, useExportLocationList } from '../api';
import { locationsToCsv } from '../../utils';

interface AppBarButtonsProps {
  onCreate: () => void;
  sortBy: SortBy<LocationRowFragment>;
}

export const AppBarButtons = ({ onCreate, sortBy }: AppBarButtonsProps) => {
  const t = useTranslation();
  const { fetchLocations, isLoading } = useExportLocationList(sortBy);

  const getCsvData = async () => {
    const { data } = await fetchLocations();
    return data?.nodes?.length ? locationsToCsv(data.nodes, t) : null;
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
          isLoading={isLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
