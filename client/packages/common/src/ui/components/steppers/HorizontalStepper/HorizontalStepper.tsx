import React, { FC } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import StepConnector, {
  stepConnectorClasses,
} from '@mui/material/StepConnector';
import {
  GlobalStyles,
  PaletteColor,
  StepIconProps,
  useTheme,
} from '@mui/material';

export interface StepDefinition {
  active?: boolean;
  completed?: boolean;
  error?: boolean;
  icon?: React.ReactNode;
  label: string;
  optional?: React.ReactNode;
}

export type StepperColour = 'primary' | 'secondary';

interface StepperProps {
  steps: StepDefinition[];
  colour?: StepperColour;
  nowrap?: boolean;
}

type PaletteColour = Omit<PaletteColor, 'contrastText'> & { error: string };

const getConnector = (paletteColour: PaletteColour) => () => {
  const style = {
    '&.MuiStepConnector-root': {
      left: 'calc(-50% + 15px)',
      right: 'calc(50% + 15px)',
    },
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: paletteColour.light,
      // The width is for the connector which is significantly thicker than the default.
      borderWidth: '4px 0 0 0',
    },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: paletteColour.main,
      },
    },
    [`&.${stepConnectorClasses.completed}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: paletteColour.main,
      },
    },
  };

  return <StepConnector sx={style} />;
};

const getCircle =
  (paletteColour: PaletteColour) =>
  ({ active, completed, icon, error }: StepIconProps) => {
    const colors = {
      borderColor: paletteColour.light,
      backgroundColor: '#fff',
      color: paletteColour.main,
    };

    if (completed) {
      colors.backgroundColor = paletteColour.main;
      colors.borderColor = paletteColour.main;
      colors.color = '#fff';
    }

    if (active) {
      colors.backgroundColor = '#fff';
      colors.color = paletteColour.dark;
    }

    if (!!error) {
      colors.color = paletteColour.error;
    }

    return (
      <div
        style={{
          border: 'solid',
          borderWidth: 3,
          width: 30,
          height: 30,
          borderRadius: 30,
          textAlign: 'center',
          fontWeight: 700,
          animation: active ? 'pulse 2s infinite' : 'none',
          ...colors,
        }}
      >
        {icon}
      </div>
    );
  };

const getAnimationStyles = (colour: StepperColour) => {
  const colour1 =
    colour === 'primary' ? 'rgb(254, 147, 24, 0.4)' : 'rgba(53, 104, 212, 0.4)';
  const colour2 = 'rgba(53, 104, 212, 0)';

  return {
    '@-webkit-keyframes pulse': {
      '0%': {
        WebkitBoxShadow: `0 0 0 0 ${colour1}`,
      },
      '70%': {
        WebkitBoxShadow: `0 0 0 10px ${colour2}`,
      },
      '100%': {
        WebkitBoxShadow: `0 0 0 0 ${colour2}`,
      },
    },
    '@keyframes pulse': {
      '0%': {
        MozBoxShadow: `0 0 0 0 ${colour1}`,
        boxShadow: `0 0 0 0 ${colour1}`,
      },
      '70%': {
        MozBoxShadow: `0 0 0 10px ${colour2}`,
        boxShadow: `0 0 0 10px ${colour2}`,
      },
      '100%': {
        MozBoxShadow: `0 0 0 0 ${colour2}`,
        boxShadow: `0 0 0 0 ${colour2}`,
      },
    },
  };
};

const getLabelStyle = (
  colour: StepperColour,
  completed?: boolean,
  error?: boolean,
  nowrap?: boolean
) => {
  let color = `${colour}.light`;
  switch (true) {
    case !!error:
      color = 'error.main';
      break;
    case !!completed:
      color = `${colour}.dark`;
      break;
  }
  return nowrap ? { color, whiteSpace: 'nowrap' } : { color };
};

const usePaletteColour = (colour: StepperColour): PaletteColour => {
  const theme = useTheme();
  switch (colour) {
    case 'secondary':
      return {
        light: theme.palette.gray.pale,
        main: theme.palette.secondary.light,
        dark: theme.palette.secondary.dark,
        error: theme.palette.error.main,
      };
    default:
      return {
        light: theme.palette.primary.light,
        main: theme.palette.primary.main,
        dark: theme.palette.primary.dark,
        error: theme.palette.error.main,
      };
  }
};

const getTestId = (step: StepDefinition) => {
  let testId = '';
  if (step.active) testId += 'active';
  if (step.completed) testId += 'completed';

  return testId;
};

/* alternativeLabel shows icons on top */
export const HorizontalStepper: FC<StepperProps> = ({
  colour = 'secondary',
  steps,
  nowrap = false,
}) => {
  const paletteColour = usePaletteColour(colour);
  const StyledConnector = getConnector(paletteColour);

  return (
    <Box flex={1}>
      <GlobalStyles styles={getAnimationStyles(colour)} />
      <Stepper
        connector={<StyledConnector />}
        activeStep={steps.findIndex(step => step?.active)}
        orientation="horizontal"
        alternativeLabel
      >
        {steps.map(step => {
          const { active, completed, label, optional, icon, error } = step;
          // There is no accessability role that I can find to accurately describe
          // a stepper, so turning to testids to mark the active/completed steps
          // for tests
          const stepIcon = icon ? undefined : getCircle(paletteColour);

          return (
            <Step
              data-testid={getTestId(step)}
              key={label}
              active={active}
              completed={completed}
            >
              <StepLabel
                StepIconComponent={stepIcon}
                optional={optional}
                icon={icon}
                error={error}
              >
                <Box
                  flexDirection="row"
                  display="flex"
                  flex={1}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Typography
                    sx={getLabelStyle(colour, completed, error, nowrap)}
                    variant="body2"
                    fontSize="12px"
                  >
                    {step.label}
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
