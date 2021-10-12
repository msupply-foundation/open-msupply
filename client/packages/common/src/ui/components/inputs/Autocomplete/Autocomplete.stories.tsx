import React from 'react';
import { Grid, Paper } from '@mui/material';
import { Story } from '@storybook/react';
import { Autocomplete } from './Autocomplete';
import { styled } from '@mui/system';

export default {
  title: 'Inputs/Autocomplete',
  component: Grid,
};

const StyledPaper = styled(Paper)({
  height: 90,
  padding: 10,
  width: 400,
});

// TODO: Currently the styles are broken for this only within storybook
const Template: Story = () => (
  <Grid>
    <StyledPaper>
      <Autocomplete options={[1, 2, 3]} width={300} />
    </StyledPaper>
  </Grid>
);

export const Primary = Template.bind({});
