import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Story } from '@storybook/react';
import { BasicTextInput } from './BasicTextInput';
import { InputWithLabelRow } from './InputWithLabelRow';
import { NumericTextInput } from './NumericTextInput';
import { LoginTextInput } from './LoginTextInput';

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
            <Typography>Using InputLabelRow</Typography>
            <InputWithLabelRow label="Name" Input={<BasicTextInput />} />
          </StyledPaper>
          <StyledPaper>
            <Typography>With value specified</Typography>
            <InputWithLabelRow
              label="Name"
              Input={<BasicTextInput value="Some content" />}
            />
          </StyledPaper>
          <StyledPaper>
            <Typography>Disabled</Typography>
            <InputWithLabelRow
              label="Name"
              Input={<BasicTextInput value="Some content" disabled />}
            />
          </StyledPaper>
          <StyledPaper style={{ backgroundColor: '#eee' }}>
            <Typography>Login</Typography>
            <LoginTextInput label="Username" />
          </StyledPaper>
        </Grid>
      </Grid>
    </Grid>
  </Grid>
);

const NumericTemplate: Story = () => (
  <Grid>
    <Grid item>
      <Grid container spacing={1}>
        <Grid item xs>
          <StyledPaper>
            <Typography>NumericTextInput</Typography>
            <NumericTextInput />
          </StyledPaper>
          <StyledPaper>
            <Typography>Disabled</Typography>
            <NumericTextInput value={25} disabled />
          </StyledPaper>
        </Grid>
      </Grid>
    </Grid>
  </Grid>
);

export const Basic = Template.bind({});
export const Numeric = NumericTemplate.bind({});
