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
            <Typography variant="body1">{course.courseTitle}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CalculationStep
                title={t('label.annual-target-doses-calculation')}
                formula={t('description.annual-target-doses-calculation')}
                substitution={`${format(course.targetPopulation)} × ${format(course.numberOfDoses)} × (${format(course.coverageRate)} / 100) × ${round(course.lossFactor, 3)}`}
                result={`= ${round(course.annualTargetDoses, 2)} ${t('label.doses-per-year')}`}
              />

              <CalculationStep
                title={t('label.forecast-doses-calculation')}
                formula={t('description.forecast-doses-calculation')}
                substitution={`(${round(course.annualTargetDoses, 2)} / 12) × (${format(course.supplyPeriodMonths)} + ${format(course.bufferStockMonths)})`}
                result={`= ${round(course.forecastDoses, 2)} ${t('label.doses').toLowerCase()}`}
              />

              <CalculationStep
                title={t('label.forecast-units-calculation')}
                formula={t('description.forecast-units-calculation')}
                substitution={`${round(course.forecastDoses, 2)} / ${format(course.dosesPerUnit)}`}
                result={`= ${format(Math.ceil(course.forecastUnits))} ${t('label.units').toLowerCase()}`}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default ForecastCalculationDisplay;
