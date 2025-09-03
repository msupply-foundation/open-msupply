import React, { memo, ReactElement } from 'react';
import {
  AppBarButtonsPortal,
  GoodsReceivedNodeStatus,
  Grid,
  useDetailPanel,
} from '@openmsupply-client/common';
import { isGoodsReceivedEditable } from '../../../utils';
import { useGoodsReceived } from '../../api';
import { AddButtons } from './AddButtons';

export const AppBarButtonsComponent = (): ReactElement => {
  const { OpenButton } = useDetailPanel();

  const {
    query: { data, isLoading },
  } = useGoodsReceived();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        {/* Add Buttons as needed */}
        <AddButtons
          goodsReceived={data}
          disable={
            isLoading ||
            !isGoodsReceivedEditable(
              data?.status ?? GoodsReceivedNodeStatus.New
            )
          }
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = memo(AppBarButtonsComponent);
