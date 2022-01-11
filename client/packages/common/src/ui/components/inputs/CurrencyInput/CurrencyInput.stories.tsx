import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { CurrencyInput } from './CurrencyInput';
import { Grid, Typography } from '@mui/material';

export default {
  title: 'Inputs/CurrencyInput',
  component: CurrencyInput,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof CurrencyInput>;

const Template: ComponentStory<typeof CurrencyInput> = () => {
  const [value1, setValue1] = React.useState(0);

  return (
    <Grid container spacing={5} flexDirection="column">
      <Grid item>
        <Typography>CurrencyInput</Typography>
        <CurrencyInput defaultValue={value1} onChangeNumber={setValue1} />
        <Typography>Stored value: {value1}</Typography>
      </Grid>
      <Grid item>
        <Typography>Disabled</Typography>
        <CurrencyInput value={value1} disabled onChangeNumber={() => {}} />
      </Grid>
    </Grid>
  );
};

export const Primary = Template.bind({});
