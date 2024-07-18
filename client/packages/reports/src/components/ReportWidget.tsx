import React, { PropsWithChildren } from 'react';
import { Box, Card, CircularProgress, Grid, Typography } from '@mui/material';
import { ChevronDownIcon, SvgIconProps } from '@common/icons';
import { ReportRowFragment } from '@openmsupply-client/system';

const Loading = () => (
  <Box display="flex" flex={1} justifyContent="center" alignItems="center">
    <CircularProgress />
  </Box>
);

interface ReportWidgetProps {
  height?: number | string;
  maxWidth?: number | string;
  title: string;
  Icon: (props: SvgIconProps & { stroke?: string }) => JSX.Element;
  reports: ReportRowFragment[] | undefined;
}

export const ReportWidget: React.FC<PropsWithChildren<ReportWidgetProps>> = ({
  height,
  maxWidth,
  title,
  Icon,
  reports,
}) => (
  <Card
    sx={{
      borderRadius: '16px',
      height,
      maxWidth,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      margin: '11px',
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

    <React.Suspense fallback={<Loading />}>
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
        paddingTop={2}
      >
        {reports?.map(report => (
          <Grid
            sx={{
              display: 'flex',
            }}
            key={report?.id}
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
        ))}
      </Grid>
    </React.Suspense>
  </Card>
);
