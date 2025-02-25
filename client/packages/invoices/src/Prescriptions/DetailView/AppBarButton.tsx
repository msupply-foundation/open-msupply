import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  InfoOutlineIcon,
  LoadingButton,
  PrinterIcon,
  ReportContext,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { Draft } from '../..';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '../../../../system/src/Report';
import { JsonData } from '@openmsupply-client/programs';

interface AppBarButtonProps {
  onAddItem: (draft?: Draft) => void;
  onViewHistory: (draft?: Draft) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  onViewHistory,
}) => {
  const { isDisabled, query: data } = usePrescription();
  const { OpenButton } = useDetailPanel();
  const { print, isPrinting } = usePrintReport();
  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    print({ reportId: report.id, dataId: data?.data?.id, args });
  };
  const t = useTranslation();
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
          context={ReportContext.Prescription}
          onPrint={printReport}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
            label={t('button.print')}
          />
        </ReportSelector>
        <ButtonWithIcon
          label={t('button.history')}
          Icon={<InfoOutlineIcon />}
          onClick={() => onViewHistory()}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
