import React from 'react';
import {
  Grid,
  BarIcon,
  Widget,
  Typography,
  ChevronDownIcon,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { ReportRowFragment } from '@openmsupply-client/system';

interface StockReportProps {
  reports: ReportRowFragment[] | undefined;
}

export const StockAndItemWidget: React.FC<StockReportProps> = ({ reports }) => {
  const t = useTranslation('reports');

  return (
    <>
      <Widget title={t('heading.stock-and-items')} Icon={BarIcon}>
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
