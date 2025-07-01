import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  AddButton,
  Grid,
  useDetailPanel,
  useTranslation,
  InfoOutlineIcon,
  ReportContext,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { Draft } from '../../StockOut';
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

  const handlePrintLabels = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (prescription) {
      printPrescriptionLabels(prescription, prescription.lines.nodes, e);
    }
  };

  const extraOptions = prescription
    ? [
        {
          value: 'Print Labels',
          label: t('button.print-prescription-label'),
          isDisabled: isDisabled,
          onClick: handlePrintLabels,
        },
      ]
    : [];

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          disabled={isDisabled}
          label={t('button.add-item')}
          onClick={onAddItem}
        />
        <ReportSelector
          context={ReportContext.Prescription}
          onPrint={printReport}
          isPrinting={isPrintingReceipt || isPrintingLabels}
          customOptions={extraOptions}
          onPrintCustom={e => handlePrintLabels(e)}
          buttonLabel={t('button.print-report-options')}
        />
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
