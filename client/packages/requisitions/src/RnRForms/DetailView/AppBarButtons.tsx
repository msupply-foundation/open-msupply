import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ReportContext,
  useDetailPanel,
  useParams,
  FullScreenButton,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { useRnRForm } from '../api';

export const AppBarButtonsComponent = () => {
  const { OpenButton } = useDetailPanel();
  const { id = '' } = useParams();
  const {
    query: { data },
  } = useRnRForm({ rnrFormId: id });

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <FullScreenButton />
        <ReportSelector
          context={ReportContext.Requisition}
          subContext="R&R"
          dataId={data?.id ?? ''}
        />

        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
