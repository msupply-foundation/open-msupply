import React, { FC } from 'react';
import Typography from '@mui/material/Typography';
import { HorizontalStepper, StepDefinition } from '../HorizontalStepper';

type WizardStepDefinition = StepDefinition & {
  description: string;
};

interface StepperProps {
  activeStep: number;
  steps: WizardStepDefinition[];
  nowrap?: boolean;
}

export const WizardStepper: FC<StepperProps> = ({
  activeStep,
  nowrap,
  steps,
}) => {
  const wizardSteps = steps.map((step, index) => {
    const active = index === activeStep;
    const completed = index <= activeStep;
    const optional = (
      <Typography color="gray.main" variant="body2" fontSize="12px">
        {step.description}
      </Typography>
    );

    return { ...step, active, completed, optional };
  });

  return <HorizontalStepper steps={wizardSteps} nowrap={nowrap} />;
};
