import React, { FC } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import StepConnector, {
  stepConnectorClasses,
} from '@mui/material/StepConnector';
import { styled } from '@mui/material';

import { LocaleKey, useTranslation } from '../../../../intl';

interface StepDefinition {
  label: LocaleKey;
  description: string;
}

interface StepperProps {
  activeStep: number;
  steps: StepDefinition[];
}

const StyledConnector = styled(StepConnector)(({ theme }) => ({
  '&.MuiStepConnector-root': {
    // This margin is an adjustment as the icon we use: the circle, is smaller
    // than what is the default size, so this tries to centre align the connector by
    // overriding the default.
    marginLeft: '3px',
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: theme.palette.secondary.light,

    // The width is for the connector which is significantly thicker than the default.
    // Additionally the height has been shrunk so that each connector hits the icons
    // on the top and bottom sufficiently.
    borderWidth: 6,
    minHeight: 12,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: theme.palette.secondary.dark,
    },
  },

  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: theme.palette.secondary.dark,
    },
  },
}));

const Circle = styled('div', {
  shouldForwardProp: prop =>
    prop !== 'completed' && prop !== 'active' && prop !== 'error',
})<{
  completed: boolean;
  active: boolean;
}>(({ active, completed, theme }) => {
  // Base colours for all uncompleted and non-active steps.
  const colors = {
    borderColor: theme.palette.secondary.light,
    backgroundColor: theme.palette.secondary.light,
  };

  // If the step is completed, then everything is dark.
  if (completed) {
    colors.backgroundColor = theme.palette.secondary.dark;
    colors.borderColor = theme.palette.secondary.dark;
  }

  // If the step is active, the center of the circle is white
  if (active) {
    colors.backgroundColor = 'white';
  }

  return {
    border: 'solid',

    // These numbers are arbitrary and are just what look good to me.
    // our designs have the circle icon at 16px - with the border I
    // believe this is 15px.. either 4px on the border or 13px on the
    // dimensions and it looks a bit off.. maybe this isn't how it works.
    borderWidth: '3px',
    width: '12px',
    height: '12px',
    borderRadius: '16px',
    ...colors,
  };
});

export const VerticalStepper: FC<StepperProps> = ({ activeStep, steps }) => {
  const t = useTranslation();

  return (
    <Box flex={1}>
      <Stepper
        connector={<StyledConnector />}
        activeStep={activeStep}
        orientation="vertical"
      >
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = index <= activeStep;

          // There is no accessability role that I can find to accurately describe
          // a stepper, so turning to testids to mark the active/completed steps
          // for tests
          let testId = '';
          if (isActive) testId += 'active';
          if (isCompleted) testId += 'completed';

          return (
            <Step
              data-testid={testId}
              key={step.label}
              active={isActive}
              completed={isCompleted}
            >
              <StepLabel
                sx={{
                  '&.MuiStepLabel-root': {
                    padding: 0,
                    position: 'relative',
                    height: '8px',
                  },
                  fontSize: 'small',
                }}
                StepIconComponent={Circle}
              >
                <Box
                  flexDirection="row"
                  display="flex"
                  flex={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="body2" lineHeight={0} fontSize="small">
                    {t(step.label)}
                  </Typography>
                  <Typography
                    color="midGrey"
                    variant="body2"
                    lineHeight={0}
                    fontSize="small"
                  >
                    {step.description}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
};
