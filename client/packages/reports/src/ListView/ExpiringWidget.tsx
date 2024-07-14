import React from 'react';
import {
  Grid,
  Widget,
  Typography,
  TrendingDownIcon,
  ChevronDownIcon,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { ReportRowFragment } from '@openmsupply-client/system';

interface ExpiringReportProps {
  reports: ReportRowFragment[] | undefined;
}

export const ExpiringWidget: React.FC<ExpiringReportProps> = ({ reports }) => {
  const t = useTranslation('reports');

  return (
    <>
      <Widget title={t('heading.expiring')} Icon={TrendingDownIcon}>
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
      </Widget>
    </>
  );
};
