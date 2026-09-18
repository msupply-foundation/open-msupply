import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  ReportContext,
  useAuthContext,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { useRequest } from '../../api';
import { UseSuggestedQuantityButton } from './UseSuggestedQuantityButton';
import { AddButton } from './AddButton';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  isDisabled,
}) => {
  const { store } = useAuthContext();
  const isProgram = useRequest.utils.isProgram();
  const { OpenButton } = useDetailPanel();
  const { data } = useRequest.document.get();

  const disableAddItem = isDisabled || isProgram;

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          onAddItem={onAddItem}
          status={data?.status}
          disableAddItem={disableAddItem}
        />

        <UseSuggestedQuantityButton />

        <ReportSelector
          testId="export-or-print-button"
          context={ReportContext.InternalOrder}
          // Filters out reports that have a subContext (i.e. `R&R`)
          queryParams={{ filterBy: { subContext: { equalAnyOrNull: [] } } }}
          dataId={data?.id ?? ''}
          // Sent for every program order, not just one showing the indicators
          // tab: a report declaring $programId / $periodId / $customerNameId
          // fails outright when they are absent from the arguments, so tying
          // them to a display gate could only break such a report (#12713).
          // Sending null instead is not an option — the indicator value fields
          // take String! arguments and reject it.
          extraArguments={
            data?.program?.id && data?.period?.id && store?.nameId
              ? {
                  periodId: data.period.id,
                  programId: data.program.id,
                  customerNameId: store.nameId,
                }
              : undefined
          }
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
