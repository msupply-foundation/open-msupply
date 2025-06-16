import React, { FC, useState } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  AddButton,
  Grid,
  useDetailPanel,
  useTranslation,
  InfoOutlineIcon,
  ReportContext,
  SplitButton,
  PrinterIcon,
  SplitButtonOption,
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

  const options = [
    {
      value: 'export_or_print',
      label: t('button.export-or-print'),
    },
    {
      value: 'print_labels',
      label: t('button.print-prescription-label'),
    },
  ];

  const [selected, setSelected] = useState<SplitButtonOption<string>>(
    options[0]!
  );

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
          disabled={isDisabled}
          CustomButton={({ onPrint }) => {
            const handleClick = (
              option: SplitButtonOption<string>,
              e?: React.MouseEvent<HTMLButtonElement>
            ) => {
              if (option.value === 'print_labels') {
                handlePrintLabels(e);
              } else {
                onPrint();
              }
            };
            return (
              <SplitButton
                color="primary"
                openFrom={'bottom'}
                Icon={<PrinterIcon />}
                isLoading={isPrintingLabels}
                onClick={handleClick}
                selectedOption={selected}
                onSelectOption={(option, e) => {
                  setSelected(option);
                  handleClick(option, e);
                }}
                options={options}
              />
            );
          }}
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
