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
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { SupplyRequestedQuantityButton } from './SupplyRequestedQuantityButton';
import { useResponse } from '../../api';
import { JsonData } from '@openmsupply-client/programs';

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
  const { print, isPrinting } = usePrintReport();
  const disableAddButton = isDisabled || isProgram || hasLinkedRequisition;

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
          disabled={disableAddButton}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={onAddItem}
        />

        <SupplyRequestedQuantityButton />
        <ReportSelector
          context={ReportContext.Requisition}
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
