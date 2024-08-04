import React, { PropsWithChildren } from 'react';
import { ChevronDownIcon, SvgIconProps } from '@common/icons';
import { ReportRowFragment } from '@openmsupply-client/system';
import {
  BasicSpinner,
  Link,
  RouteBuilder,
  Card,
  Grid,
  Typography,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

interface ReportWidgetProps {
  height?: number | string;
  maxWidth?: number | string;
  title: string;
  Icon: (props: SvgIconProps & { stroke?: string }) => JSX.Element;
  reports: ReportRowFragment[] | undefined;
  onReportClick: (report: ReportRowFragment) => void;
  hasReports: boolean;
}

export const ReportWidget: React.FC<PropsWithChildren<ReportWidgetProps>> = ({
  height,
  maxWidth,
  title,
  Icon,
  reports,
  onReportClick,
  hasReports = false,
}) => {
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
              </Grid>
            )}
          </React.Suspense>
        </Card>
      ) : null}
    </>
  );
};
