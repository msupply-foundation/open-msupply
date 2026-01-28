import React from 'react';
import {
  ArrayElement,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Plugins,
  QueryClientProviderProxy,
  ThemeProviderProxy,
  ExpandIcon,
  useTranslation,
  useFormatNumber,
} from '@openmsupply-client/common';
import { usePluginData } from '../../../../../api';

interface ForecastQuantityData {
  courseTitle: string;
  numberOfDoses: number;
  coverageRate: number;
  targetPopulation: number;
  lossFactor: number;
  annualTargetDoses: number;
  bufferStockMonths: number;
  supplyPeriodMonths: number;
  dosesPerUnit: number;
  forecastDoses: number;
  forecastUnits: number;
}

export type ForecastCalculationDisplayPlugin = ArrayElement<
  NonNullable<Plugins['requestRequisitionLine']>['editViewInfo']
>;

const ForecastCalculationDisplayInner: ForecastCalculationDisplayPlugin = ({
  line,
}) => {
  const {
    query: { data },
  } = usePluginData({
    pluginCode: 'forecasting_plugins',
    filter: {
      dataIdentifier: { equalTo: 'FORECAST_QUANTITY_INFO' },
      relatedRecordId: { equalTo: line.id },
    },
    queryKey: [line.id],
  });
  const t = useTranslation();
  const { round, format } = useFormatNumber();

  const parsed = JSON.parse(data?.[0]?.data ?? '{}');
  const { vaccineCourses } = parsed as {
    vaccineCourses: ForecastQuantityData[];
  };

  if (!vaccineCourses || vaccineCourses.length === 0) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', m: 2, pr: 3 }}>
      <Typography variant="body1" fontWeight={700}>
        {t('label.population-forecast-calculation')}
      </Typography>

      {vaccineCourses.map((course, index) => (
        <Accordion key={index}>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="body1">{course.courseTitle}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {t('label.annual-target-doses-calculation')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    mb: 1,
                    backgroundColor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {t('description.annual-target-doses-calculation')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  {format(course.targetPopulation)} ×{' '}
                  {format(course.numberOfDoses)} × (
                  {format(course.coverageRate)} / 100) ×{' '}
                  {round(course.lossFactor, 3)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: 'success.main',
                  }}
                >
                  = {round(course.annualTargetDoses, 2)}{' '}
                  {t('label.doses-per-year')}
                </Typography>
              </Box>

              {/* Forecast Doses Calculation */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {t('label.forecast-doses-calculation')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    mb: 1,
                    backgroundColor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {t('description.forecast-doses-calculation')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  ({round(course.annualTargetDoses, 2)} / 12) × (
                  {format(course.supplyPeriodMonths)} +{' '}
                  {format(course.bufferStockMonths)})
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: 'success.main',
                  }}
                >
                  = {round(course.forecastDoses, 2)} {t('label.doses')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {t('label.forecast-units-calculation')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    mb: 1,
                    backgroundColor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {t('description.forecast-units-calculation')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  {round(course.forecastDoses, 2)} /{' '}
                  {format(course.dosesPerUnit)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: 'success.main',
                  }}
                >
                  = {format(Math.ceil(course.forecastUnits))} {t('label.units')}
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

const ForecastCalculationDisplay: ForecastCalculationDisplayPlugin = props => {
  return (
    <ThemeProviderProxy>
      <QueryClientProviderProxy>
        <ForecastCalculationDisplayInner {...props} />
      </QueryClientProviderProxy>
    </ThemeProviderProxy>
  );
};

export default ForecastCalculationDisplay;
