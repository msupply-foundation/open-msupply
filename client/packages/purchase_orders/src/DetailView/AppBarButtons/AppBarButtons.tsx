import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  // useDetailPanel,
  useTranslation,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { AddButton } from './AddButton';
// import { AddFromMasterListButton } from './AddFromMasterListButton';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  isDisabled,
}) => {
  const t = useTranslation();
  // const { OpenButton } = useDetailPanel();
  const {
    query: { data, isLoading },
  } = usePurchaseOrder();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          purchaseOrder={data ?? undefined}
          onAddItem={onAddItem}
          disable={isDisabled}
          disableAddFromMasterListButton={isLoading}
          disableAddFromInternalOrderButton={isLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
