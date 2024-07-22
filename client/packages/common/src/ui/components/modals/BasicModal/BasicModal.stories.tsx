import React, { useState } from 'react';
import { Box, Grid, Button } from '@mui/material';
import { StoryFn } from '@storybook/react';
import { BasicModal } from './BasicModal';

export default {
  title: 'Modals/BasicModal',
  component: BasicModal,
};

const Template: StoryFn = ({ children, width = 300, height = 300 }) => {
  const [open, setOpen] = useState(false);

  return (
    <Grid>
      <Button onClick={() => setOpen(state => !state)}>Open Modal</Button>
      <BasicModal
        width={width}
        height={height}
        open={open}
        onClose={() => setOpen(false)}
      >
        {children}
      </BasicModal>
    </Grid>
  );
};

export const Simple = Template.bind({});

export const WithChildren = Template.bind({});
WithChildren.args = {
  children: (
    <Box>
      <span>Modal Children</span>
    </Box>
  ),
};

export const VariedDimensions = Template.bind({});
VariedDimensions.args = {
  height: 500,
  width: 100,
};
