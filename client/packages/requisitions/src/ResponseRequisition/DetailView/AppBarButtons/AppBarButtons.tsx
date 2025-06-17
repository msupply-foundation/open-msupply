import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  ReportContext,
  useDetailPanel,
  useTranslation,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { SupplyRequestedQuantityButton } from './SupplyRequestedQuantityButton';
import { useResponse } from '../../api';

interface AppBarButtonProps {
  isDisabled: boolean;
  hasLinkedRequisition: boolean;
  isProgram: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent = ({
  isDisabled,
  hasLinkedRequisition,
  isProgram,
  onAddItem,
}: AppBarButtonProps) => {
  const t = useTranslation();
  const { OpenButton } = useDetailPanel();
  const { data } = useResponse.document.get();
  const disableAddButton = isDisabled || isProgram || hasLinkedRequisition;

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={disableAddButton}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={onAddItem}
        />

        <SupplyRequestedQuantityButton />
        <ReportSelector
          context={ReportContext.Requisition}
          dataId={data?.id ?? ''}
          // Filters out reports that have a subContext (i.e. `R&R`)
          queryParams={{ filterBy: { subContext: { equalAnyOrNull: [] } } }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
