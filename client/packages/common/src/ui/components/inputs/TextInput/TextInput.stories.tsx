import React, { useState } from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { StoryFn } from '@storybook/react';
import { BasicTextInput } from './BasicTextInput';
import { InputWithLabelRow } from './InputWithLabelRow';
import { NumericTextInput } from './';

export default {
  title: 'Inputs/TextInputs',
  component: Grid,
};

const StyledPaper = styled(Paper)({
  textAlign: 'center',
  minHeight: 90,
  padding: 10,
  width: 300,
});

const Template: StoryFn = () => (
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

const NumericTemplate: StoryFn = () => {
  const [positive, setPositive] = useState<number | undefined>();
  const [negative, setNegative] = useState<number | undefined>();
  const [decimal, setDecimal] = useState<number | undefined>();
  const [rangeVal, setRangeVal] = useState<number | undefined>();
  const [fixedDecimal, setFixedDecimal] = useState<number | undefined>(1);

  return (
    <Grid>
      <Grid item>
        <Grid container spacing={1}>
          <Grid item xs>
            <StyledPaper>
              <Typography>Numeric text input, default options</Typography>
              <NumericTextInput value={positive} onChange={setPositive} />
            </StyledPaper>
            <StyledPaper>
              <Typography>Disabled</Typography>
              <NumericTextInput value={25} disabled />
            </StyledPaper>
            <StyledPaper>
              <Typography>Negative values allowed</Typography>
              <NumericTextInput
                value={negative}
                onChange={setNegative}
                allowNegative
              />
            </StyledPaper>
            <StyledPaper>
              <Typography>Decimals allowed (3dp), default 5, min 1</Typography>
              <NumericTextInput
                value={decimal}
                defaultValue={5}
                decimalLimit={3}
                onChange={setDecimal}
                min={1}
              />
            </StyledPaper>
            <StyledPaper>
              <Typography>
                Range -20 to 20, step increment 2, multiplier 5
              </Typography>
              <NumericTextInput
                value={rangeVal}
                onChange={setRangeVal}
                min={-20}
                max={20}
                step={2}
                multiplier={5}
              />
            </StyledPaper>
            <StyledPaper>
              <Typography>
                Fixed-length decimal (2), init value 1, positive
              </Typography>
              <NumericTextInput
                value={fixedDecimal}
                onChange={setFixedDecimal}
                decimalLimit={2}
                decimalMin={2}
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
