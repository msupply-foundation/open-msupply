import React from 'react';
import { Box, Typography } from '@mui/material';
import { HorizontalStepper } from './HorizontalStepper';
import { StoryFn } from '@storybook/react';

export default {
  title: 'Steppers/HorizontalStepper',
  component: HorizontalStepper,
};

const Template: StoryFn<{ colour: 'primary' | 'secondary' }> = args => (
  <Box>
    <Box width={500} m={4}>
      <Typography>Basic stepper with the second step active</Typography>
      <HorizontalStepper
        colour={args.colour}
        steps={[
          { label: 'Customer Information', completed: true },
          { label: 'Address Information', active: true },
          { label: 'Category Information' },
        ]}
      />
    </Box>
    <Box width={500} m={4}>
      <Typography>
        Basic stepper with the second step active, and with an error.
      </Typography>
      <HorizontalStepper
        colour={args.colour}
        steps={[
          {
            label: 'Customer Information',
            completed: true,
          },
          {
            label: 'Address Information',
            active: true,
            error: true,
          },
          { label: 'Category Information' },
        ]}
      />
    </Box>
    <Typography>
      <small>
        Note: Adding custom icons and optional components is supported.. but not
        working with storybook for some reason.
      </small>
    </Typography>
  </Box>
);

export const Primary = Template.bind({});
Primary.args = { colour: 'primary' };

export const Secondary = Template.bind({});
Secondary.args = { colour: 'secondary' };
