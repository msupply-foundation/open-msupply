import React, { FC } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import StepConnector, {
  stepConnectorClasses,
} from '@mui/material/StepConnector';
import { StepIconProps, styled, useTheme } from '@mui/material';

interface StepDefinition {
  label: string;
  description: string;
  clickable?: boolean;
}

interface StepperProps {
  activeStep: number;
  steps: StepDefinition[];
  alternativeLabel?: boolean;
  onClickStep?: (stepName: string) => void;
}

const StyledConnector = styled(StepConnector)(({ theme }) => ({
  '&.MuiStepConnector-root': {
    left: 'calc(-50% + 15px)',
    right: 'calc(50% + 15px)',
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: theme.palette.gray.pale,
    // The width is for the connector which is significantly thicker than the default.
    borderWidth: '4px 0 0 0',
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: theme.palette.secondary.light,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: theme.palette.secondary.light,
    },
  },
}));

const Circle: FC<StepIconProps> = ({ active, completed, icon }) => {
  const theme = useTheme();
  const colors = {
    borderColor: theme.palette.gray.pale,
    backgroundColor: '#fff',
    color: theme.palette.secondary.light,
  };

  // If the step is completed, then everything is light.
  if (completed) {
    colors.backgroundColor = theme.palette.secondary.light;
    colors.borderColor = theme.palette.secondary.light;
    colors.color = '#fff';
  }

  if (active) {
    colors.backgroundColor = '#fff';
    colors.color = theme.palette.secondary.dark;
  }

  const style = {
    border: 'solid',
    borderWidth: '3px',
    width: '30px',
    height: '30px',
    borderRadius: '30px',
    textAlign: 'center' as 'center' | 'left' | 'right',
    fontWeight: 700,
    ...colors,
  };

  return <div style={style}>{icon}</div>;
};

export const ClickableStepper: FC<StepperProps> = ({
  activeStep,
  steps,
  alternativeLabel,
  onClickStep,
}) => (
  <Box flex={1}>
    <Stepper
      connector={<StyledConnector />}
      activeStep={activeStep}
      orientation="horizontal"
      alternativeLabel={alternativeLabel}
    >
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isCompleted = index <= activeStep;

        // There is no accessability role that can be used in test cases, so we add a test-id to support testing
        let testId = '';
        if (isActive) testId += 'active';
        if (isCompleted) testId += 'completed';

        return (
          <Step
            data-testid={testId}
            key={step.label}
            active={isActive}
            completed={isCompleted}
            sx={
              step.clickable
                ? {
                    ':hover': {
                      cursor: 'pointer',
                    },
                  }
                : null
            }
            onClick={() => {
              if (onClickStep && step.clickable) {
                onClickStep(step.label);
              }
            }}
          >
            <StepLabel
              sx={{
                ':hover': {
                  cursor: 'pointer',
                },
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
                <Typography
                  sx={{
                    color: isCompleted ? 'secondary.dark' : 'secondary.light',
                  }}
                  variant="body2"
                  fontSize="12px"
                >
                  {step.label}
                </Typography>
                <Typography color="gray.main" variant="body2" fontSize="12px">
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
