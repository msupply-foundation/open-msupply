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
  openUploadModal: () => void;
  showIndicators?: boolean;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  openUploadModal,
  isDisabled,
  showIndicators = false,
}) => {
  const { store } = useAuthContext();
  const isProgram = useRequest.utils.isProgram();
  const { OpenButton } = useDetailPanel();
  const { data } = useRequest.document.get();

  const disableAddItem = isDisabled || isProgram;
  const disableUploadDocument = isDisabled; // Allow documents uploading only if not disabled (skip programs restriction)

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          onAddItem={onAddItem}
          openUploadModal={openUploadModal}
          status={data?.status}
          disableAddItem={disableAddItem}
          disableUploadDocument={disableUploadDocument}
        />

        <UseSuggestedQuantityButton />

        <ReportSelector
          context={ReportContext.InternalOrder}
          // Filters out reports that have a subContext (i.e. `R&R`)
          queryParams={{ filterBy: { subContext: { equalAnyOrNull: [] } } }}
          dataId={data?.id ?? ''}
          extraArguments={
            showIndicators
              ? {
                  periodId: data?.period?.id,
                  programId: data?.program?.id,
                  customerNameId: store?.nameId,
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
