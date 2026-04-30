import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  useUrlQueryParams,
  ReportContext,
} from '@openmsupply-client/common';
import { useReturns } from '../api';
import { ReportSelector } from '@openmsupply-client/system';

interface AppBarButtonProps {
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useReturns.utils.customerIsDisabled();
  const { data } = useReturns.document.customerReturn();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
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
          onClick={() => onAddItem()}
        />
        <ReportSelector
          context={ReportContext.CustomerReturn}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
          dataId={data?.id ?? ''}
        />

        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
