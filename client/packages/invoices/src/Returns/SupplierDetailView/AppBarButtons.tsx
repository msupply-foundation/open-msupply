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
import { useReturns } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { Draft } from '../../StockOut';

interface AppBarButtonProps {
  onAddItem: (draft?: Draft) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useReturns.utils.supplierIsDisabled();
  const { data } = useReturns.document.supplierReturn();
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
          context={ReportContext.SupplierReturn}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />

        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
