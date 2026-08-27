import React from 'react';
import { Box, Typography } from '@mui/material';
import { VerticalStepper } from './VerticalStepper';
import { StoryFn } from '@storybook/react';

export default {
  title: 'Steppers/VerticalStepper',
  component: VerticalStepper,
};

const Template: StoryFn = () => {
  return (
    <>
      <Typography>
        This is broken in storybook and I don&apos;t know why
      </Typography>
      <Box width={500} m={4}>
        <VerticalStepper
          steps={[
            { label: 'label.draft', description: '25/06/2021' },
            { label: 'label.allocated', description: '27/06/2021' },
            { label: 'label.picked', description: '27/06/2021' },
            { label: 'label.shipped', description: '2/07/2021' },
            { label: 'label.delivered', description: '' },
          ]}
          activeStep={3}
        />
      </Box>
    </>
  );
};

export const Primary = Template.bind({});
Primary.args = {};
