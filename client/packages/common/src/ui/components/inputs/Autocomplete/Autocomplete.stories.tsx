import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { Story } from '@storybook/react';
import { styled } from '@mui/system';

import { Autocomplete } from './Autocomplete';
import { AutocompleteList } from './AutocompleteList';

export default {
  title: 'Inputs/Autocomplete',
  component: Grid,
};

const StyledPaper = styled(Paper)({
  height: 500,
  padding: 10,
  width: 400,
});

const options = Array.from({ length: 100 }).map((_, i) => ({
  name: `${i}`,
}));

// TODO: Currently the styles are broken for this only within storybook
const Template: Story = () => (
  <Grid container>
    <Grid item>
      <StyledPaper>
        <Typography>Basic autocomplete</Typography>
        <Autocomplete options={options.map(({ name }) => name)} width="300px" />
      </StyledPaper>
    </Grid>
    <Grid item>
      <StyledPaper>
        <Typography>Autocomplete List</Typography>
        <AutocompleteList options={options} optionKey="name" />
      </StyledPaper>
    </Grid>
  </Grid>
);

export const Primary = Template.bind({});
