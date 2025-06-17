import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useStocktakeOld } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { isStocktakeDisabled } from '../../utils';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
  const { data } = useStocktakeOld.document.get();
  const isDisabled = !data || isStocktakeDisabled(data);

  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        <ReportSelector
          context={ReportContext.Stocktake}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
