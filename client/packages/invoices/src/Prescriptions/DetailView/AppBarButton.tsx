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
import { usePrintLabels } from './hooks/usePrinter';

interface AppBarButtonProps {
  onAddItem: (draft?: Draft) => void;
  onViewHistory: (draft?: Draft) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  onViewHistory,
}) => {
  const t = useTranslation();
  const {
    isDisabled,
    query: { data: prescription },
  } = usePrescription();
  const { OpenButton } = useDetailPanel();
  const { print: printReceipt, isPrinting: isPrintingReceipt } =
    usePrintReport();
  const {
    printLabels: printPrescriptionLabels,
    isPrintingLabels,
    DisabledNotification,
  } = usePrintLabels();

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    printReceipt({ reportId: report.id, dataId: prescription?.id, args });
  };

  const handlePrintLabels = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prescription) {
      printPrescriptionLabels(prescription, prescription.lines.nodes, e);
    }
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem()}
        />
        <ButtonWithIcon
          label={t('button.history')}
          Icon={<InfoOutlineIcon />}
          onClick={() => onViewHistory()}
        />
        <LoadingButton
          disabled={isDisabled}
          variant="outlined"
          startIcon={<PrinterIcon />}
          isLoading={isPrintingLabels}
          label={t('button.print-prescription-label')}
          onClick={handlePrintLabels}
        />
        <ReportSelector
          context={ReportContext.Prescription}
          onPrint={printReport}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrintingReceipt}
            label={t('button.print-receipt')}
          />
        </ReportSelector>
        <ButtonWithIcon
          label={t('button.history')}
          Icon={<InfoOutlineIcon />}
          onClick={() => onViewHistory()}
        />
        {OpenButton}
      </Grid>
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
