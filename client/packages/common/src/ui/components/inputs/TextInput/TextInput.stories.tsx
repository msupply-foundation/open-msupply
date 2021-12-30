import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Story } from '@storybook/react';
import { BasicTextInput } from './BasicTextInput';
import { InputWithLabelRow } from './InputWithLabelRow';

export default {
  title: 'Inputs/TextInputs',
  component: Grid,
};

const StyledPaper = styled(Paper)({
  textAlign: 'center',
  height: 90,
  padding: 10,
  width: 300,
});

const Template: Story = () => (
  <Grid>
    <Grid item>
      <Grid container spacing={1}>
        <Grid item xs>
          <StyledPaper>
            <Typography>BasicTextInput</Typography>
            <BasicTextInput />
          </StyledPaper>
          <StyledPaper>
            <Typography>BasicTextInput</Typography>
            <InputWithLabelRow
              label="Customer Name"
              Input={<BasicTextInput />}
            />
          </StyledPaper>
        </Grid>
      </Grid>
    </Grid>
  </Grid>
);

export const Primary = Template.bind({});
