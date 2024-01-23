import React, { useState } from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Story } from '@storybook/react';
import { BasicTextInput } from './BasicTextInput';
import { InputWithLabelRow } from './InputWithLabelRow';
import { NumericTextInput } from './';

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
        </Grid>
      </Grid>
    </Grid>
  </Grid>
);

const NumericTemplate: Story = () => {
  const [nonNegative, setNonNegative] = useState<number | undefined>(0);
  const [positive, setPositive] = useState<number | undefined>(1);
  const [decimal, setDecimal] = useState<number | undefined>();

  return (
    <Grid>
      <Grid item>
        <Grid container spacing={1}>
          <Grid item xs>
            <StyledPaper>
              <Typography>NumericTextInput</Typography>
              <NumericTextInput
                value={decimal}
                onChange={setDecimal}
                precision={2}
                allowNegative={true}
              />
            </StyledPaper>
            <StyledPaper>
              <Typography>Disabled</Typography>
              <NumericTextInput value={25} disabled />
            </StyledPaper>
            <StyledPaper>
              <Typography>Non Negative</Typography>
              <NumericTextInput
                value={nonNegative}
                onChange={setNonNegative}
                precision={2}
              />
            </StyledPaper>
            <StyledPaper>
              <Typography>Positive Integer</Typography>
              <NumericTextInput
                value={positive}
                onChange={setPositive}
                min={1}
              />
            </StyledPaper>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export const Basic = Template.bind({});
export const Numeric = NumericTemplate.bind({});
