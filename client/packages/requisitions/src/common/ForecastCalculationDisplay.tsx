import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ExpandIcon,
  useTranslation,
  useFormatNumber,
} from '@openmsupply-client/common';

interface ForecastQuantityData {
  course_title: string;
  number_of_doses: number;
  coverage_rate: number;
  target_population: number;
  loss_factor: number;
  annual_target_doses: number;
  buffer_stock_months: number;
  supply_period_months: number;
  doses_per_unit: number;
  forecast_doses: number;
  forecast_units: number;
}

interface CalculationStepProps {
  title: string;
  formula: string;
  substitution: string;
  result: string;
}

interface TextProps {
  children: React.ReactNode;
}

const FormulaDisplay = ({ children }: TextProps) => (
  <Typography
    variant="body2"
    sx={{
      mb: 1,
      backgroundColor: 'grey.100',
      p: 1,
      borderRadius: 2,
    }}
  >
    {children}
  </Typography>
);

const SubstitutionDisplay = ({ children }: TextProps) => (
  <Typography
    variant="body2"
    sx={{
      color: 'text.secondary',
      mb: 0.5,
    }}
  >
    {children}
  </Typography>
);

const ResultDisplay = ({ children }: TextProps) => (
  <Typography
    variant="body2"
    sx={{
      fontWeight: 'bold',
      color: 'success.main',
    }}
  >
    {children}
  </Typography>
);

const CalculationStep = ({
  title,
  formula,
  substitution,
  result,
}: CalculationStepProps) => (
  <Box>
    <Typography fontWeight="bold">{title}</Typography>
    <FormulaDisplay>{formula}</FormulaDisplay>
    <SubstitutionDisplay>{substitution}</SubstitutionDisplay>
    <ResultDisplay>{result}</ResultDisplay>
  </Box>
);

interface ForecastCalculationDisplayProps {
  vaccineCourses?: string | null;
}

const ForecastCalculationDisplay = ({
  vaccineCourses,
}: ForecastCalculationDisplayProps) => {
  const t = useTranslation();
  const { round, format } = useFormatNumber();

  const courses = vaccineCourses
    ? (JSON.parse(vaccineCourses) as ForecastQuantityData[])
    : [];

  if (!courses || courses.length === 0) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', m: 2, pr: 3 }}>
      <Typography variant="body1" fontWeight={700}>
        {t('label.population-forecast-calculation')}
      </Typography>

      {courses.map((course, index) => (
        <Accordion key={index}>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="body1">{course.course_title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CalculationStep
                title={t('label.annual-target-doses-calculation')}
                formula={t('description.annual-target-doses-calculation')}
                substitution={`${format(course.target_population)} × ${format(course.number_of_doses)} × (${format(course.coverage_rate)} / 100) × ${round(course.loss_factor, 3)}`}
                result={`= ${round(course.annual_target_doses, 2)} ${t('label.doses-per-year')}`}
              />

              <CalculationStep
                title={t('label.forecast-doses-calculation')}
                formula={t('description.forecast-doses-calculation')}
                substitution={`(${round(course.annual_target_doses, 2)} / 12) × (${format(course.supply_period_months)} + ${format(course.buffer_stock_months)})`}
                result={`= ${round(course.forecast_doses, 2)} ${t('label.doses').toLowerCase()}`}
              />

              <CalculationStep
                title={t('label.forecast-units-calculation')}
                formula={t('description.forecast-units-calculation')}
                substitution={`${round(course.forecast_doses, 2)} / ${format(course.doses_per_unit)}`}
                result={`= ${format(Math.ceil(course.forecast_units))} ${t('label.units').toLowerCase()}`}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default ForecastCalculationDisplay;
