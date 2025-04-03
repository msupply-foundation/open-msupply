import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
} from '@openmsupply-client/common';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { useRequest } from '../../api';
import { UseSuggestedQuantityButton } from './UseSuggestedQuantityButton';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { JsonData } from '@openmsupply-client/programs';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useRequest.utils.isDisabled();
  const isProgram = useRequest.utils.isProgram();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
  const { data } = useRequest.document.get();
  const { print, isPrinting } = usePrintReport();

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    if (!data) return;
    print({ reportId: report.id, dataId: data?.id, args });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled || isProgram}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={onAddItem}
        />

        <AddFromMasterListButton />
        <UseSuggestedQuantityButton />

        <ReportSelector
          context={ReportContext.InternalOrder}
          onPrint={printReport}
          // Filters out reports that have a subContext (i.e. `R&R`)
          queryParams={{ filterBy: { subContext: { equalAnyOrNull: [] } } }}
          isPrinting={isPrinting}
          buttonLabel={t('button.print')}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
