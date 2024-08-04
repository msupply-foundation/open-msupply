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
  hasReports: boolean;
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
  hasReports = false,
}) => {
  const navigate = useNavigate();

  const reportArgs = useCallback(
    (report: ReportRowFragment, args: JsonData | undefined) => {
      const stringifyArgs = JSON.stringify(args);
      navigate(
        RouteBuilder.create(AppRoute.Reports)
          .addPart(`${report.id}?reportArgs=${stringifyArgs}`)
          .build()
      );
    },
    [navigate]
  );

  return (
    <>
      {hasReports ? (
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
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'border',
          }}
        >
          <Grid container alignItems="center">
            <Grid
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 64,
                backgroundColor: 'background.icon',
                borderRadius: 4,
                height: 64,
                marginRight: 1.5,
              }}
            >
              <Icon color="primary" />
            </Grid>
            <Typography sx={{ fontSize: '24px', fontWeight: 'bold' }}>
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
                          paddingLeft: 1,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            color: 'secondary.main',
                            fontWeight: 'bold',
                            paddingBottom: 2,
                          }}
                        >
                          {report?.name}
                        </Typography>
                        <ChevronDownIcon
                          color="secondary"
                          sx={{
                            transform: 'rotate(-90deg)',
                            marginLeft: 1,
                          }}
                        />
                      </Grid>
                    </Link>
                  </React.Fragment>
                ))}
                <ReportArgumentsModal
                  report={reportWithArgs}
                  onReset={() => setReportWithArgs(undefined)}
                  onArgumentsSelected={reportArgs}
                />
              </Grid>
            )}
          </React.Suspense>
        </Card>
      ) : null}
    </>
  );
};
