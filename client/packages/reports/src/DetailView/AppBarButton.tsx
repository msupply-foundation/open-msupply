import React, { useCallback, useState } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  FilterIcon,
  Grid,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import {
  ReportArgumentsModal,
  ReportRowFragment,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';
import { AppRoute } from 'packages/config/src';

interface AppBarButtonsProps {
  report: ReportRowFragment;
  isDisabled: boolean;
}

export const AppBarButtonsComponent = ({
  report,
  isDisabled,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { updateQuery } = useUrlQuery();

  const [reportWithArgs, setReportWithArgs] = useState<ReportRowFragment>();

  const onReportClick = async (report: ReportRowFragment) => {
    if (report.argumentSchema) {
      setReportWithArgs(report);
    }
  };
  const reportArgs = useCallback(
    async (args: JsonData | undefined) => {
      const stringifyArgs = JSON.stringify(args);
      updateQuery({ reportArgs: stringifyArgs });
      navigate(
        RouteBuilder.create(AppRoute.Reports)
          .addPart(`${report.id}?reportArgs=${stringifyArgs}`)
          .build()
      );
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
