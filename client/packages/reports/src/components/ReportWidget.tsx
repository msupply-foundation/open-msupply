import React, { PropsWithChildren, useCallback } from 'react';
import { ChevronDownIcon, SvgIconProps } from '@common/icons';
import {
  ReportRowFragment,
  ReportArgumentsModal,
} from '@openmsupply-client/system';
import {
  BasicSpinner,
  Link,
  RouteBuilder,
  useNavigate,
  Card,
  Grid,
  Typography,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { JsonData } from '@openmsupply-client/programs';

interface ReportWidgetProps {
  height?: number | string;
  maxWidth?: number | string;
  title: string;
  Icon: (props: SvgIconProps & { stroke?: string }) => JSX.Element;
  reports: ReportRowFragment[] | undefined;
  onReportClick: (report: ReportRowFragment) => void;
  reportWithArgs?: ReportRowFragment;
  setReportWithArgs: (value: ReportRowFragment | undefined) => void;
}

export const ReportWidget: React.FC<PropsWithChildren<ReportWidgetProps>> = ({
  height,
  maxWidth,
  title,
  Icon,
  reports,
  onReportClick,
  reportWithArgs,
  setReportWithArgs,
}) => {
  const navigate = useNavigate();
  const { updateQuery } = useUrlQuery();

  const reportArgs = useCallback(
    (report: ReportRowFragment, args: JsonData | undefined) => {
      const stringifyArgs = JSON.stringify(args);
      updateQuery({ reportArgs: stringifyArgs });
      navigate(
        RouteBuilder.create(AppRoute.Reports)
          .addPart(`${report.id}?reportArgs=${stringifyArgs}`)
          .build()
      );
    },
    [navigate]
  );

  return (
    <Card
      sx={{
        borderRadius: 4,
        height,
        maxWidth,
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        margin: 1.375,
        flex: 1,
        boxShadow: theme => theme.shadows[2],
      }}
    >
      <Grid container alignItems="center">
        <Grid
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ width: 48 }}
        >
          <Icon color="primary" />
        </Grid>
        <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>
          {title}
        </Typography>
      </Grid>

      <React.Suspense fallback={<BasicSpinner inline />}>
        {reports && (
          <Grid
            container
            justifyContent="flex-start"
            flex={1}
            flexDirection="column"
            paddingTop={2}
          >
            {reports.map((report, index) => (
              <React.Fragment key={`${report.id}_${index}`}>
                <Link
                  style={{
                    textDecoration: 'none',
                  }}
                  onClick={() => {
                    onReportClick(report);
                  }}
                  to={
                    report.argumentSchema
                      ? ''
                      : RouteBuilder.create(AppRoute.Reports)
                          .addPart(report.id)
                          .build()
                  }
                >
                  <Grid
                    sx={{
                      display: 'flex',
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        paddingBottom: 2,
                      }}
                    >
                      {report?.name}
                    </Typography>
                    <ChevronDownIcon
                      sx={{
                        transform: 'rotate(-90deg)',
                        marginLeft: 1,
                      }}
                    />
                  </Grid>
                </Link>
                <ReportArgumentsModal
                  report={reportWithArgs}
                  onReset={() => setReportWithArgs(undefined)}
                  onArgumentsSelected={reportArgs}
                />
              </React.Fragment>
            ))}
          </Grid>
        )}
      </React.Suspense>
    </Card>
  );
};
