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
import { ReportSelector } from '../../../../system/src/Report';
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
  const {
    printLabels: printPrescriptionLabels,
    isPrintingLabels,
    DisabledNotification,
  } = usePrintLabels();

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
          dataId={prescription?.id ?? ''}
          loading={isPrintingLabels}
          customOptions={extraOptions}
          onPrintCustom={e => handlePrintLabels(e)}
          customLabel={t('button.print-report-options')}
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
