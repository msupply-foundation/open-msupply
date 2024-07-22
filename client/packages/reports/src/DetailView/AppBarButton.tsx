import React, { useCallback, useState } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  FilterIcon,
  Grid,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import {
  GenerateReportParams,
  ReportArgumentsModal,
  ReportRowFragment,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';

interface AppBarButtonsProps {
  report: ReportRowFragment;
  setFileId: (fileId: string | undefined) => void;
  mutateAsync: (params: GenerateReportParams) => Promise<string>;
  isDisabled: boolean;
}

export const AppBarButtonsComponent = ({
  report,
  setFileId,
  mutateAsync,
  isDisabled,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const { updateQuery } = useUrlQuery();

  const [reportWithArgs, setReportWithArgs] = useState<ReportRowFragment>();

  const onReportClick = async (report: ReportRowFragment) => {
    if (report.argumentSchema) {
      setReportWithArgs(report);
    }
  };
  const reportArgs = useCallback(
    async (report: ReportRowFragment, args: JsonData | undefined) => {
      const stringifyArgs = JSON.stringify(args);
      updateQuery({ reportArgs: stringifyArgs });
      const file = await mutateAsync({
        reportId: report.id,
        args,
        dataId: '',
      });
      setFileId(file);
    },
    [report.id]
  );

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={!isDisabled}
          label={t('label.filters')}
          Icon={<FilterIcon />}
          onClick={() => onReportClick(report)}
        />
        <ReportArgumentsModal
          report={reportWithArgs}
          onReset={() => setReportWithArgs(undefined)}
          onArgumentsSelected={reportArgs}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
