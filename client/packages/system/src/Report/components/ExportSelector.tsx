import React, { useState } from 'react';
import { useCsvToExcel } from '@openmsupply-client/system';
import {
  DownloadIcon,
  SplitButton,
  SplitButtonOption,
  useExportCSV,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';

export type ExportFormat = 'csv' | 'excel';

export interface ExportSelectorProps {
  getCsvData: () => string | null | undefined;
  filename: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ExportSelector = ({
  getCsvData,
  filename,
  isLoading = false,
  disabled = false,
}: ExportSelectorProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const exportCSV = useExportCSV();
  const { convertCsvToExcel, isConverting } = useCsvToExcel();

  const exportOptions: [
    SplitButtonOption<ExportFormat>,
    SplitButtonOption<ExportFormat>,
  ] = [
    {
      label: t('button.export-csv'),
      value: 'csv',
    },
    {
      label: t('button.export-excel'),
      value: 'excel',
    },
  ];

  const [selectedExportOption, setSelectedExportOption] = useState<
    SplitButtonOption<ExportFormat>
  >(exportOptions[0]);

  const handleExport = (option: SplitButtonOption<ExportFormat>) => {
    const csv = getCsvData();

    if (!csv) {
      error(t('error.no-data'))();
      return;
    }

    if (option.value === 'excel') {
      convertCsvToExcel({
        csvData: csv,
        filename,
      });
    } else {
      exportCSV(csv, filename);
    }
  };

  return (
    <SplitButton
      color="primary"
      Icon={<DownloadIcon />}
      isLoadingType={true}
      isLoading={isLoading || isConverting}
      options={exportOptions}
      onClick={handleExport}
      selectedOption={selectedExportOption}
      onSelectOption={setSelectedExportOption}
      label={t('button.export')}
      isDisabled={disabled}
    />
  );
};
