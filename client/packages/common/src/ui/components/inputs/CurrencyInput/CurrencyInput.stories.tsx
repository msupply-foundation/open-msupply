import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { CurrencyInput } from './CurrencyInput';
import { Typography } from '@mui/material';
import { Grid } from '@openmsupply-client/common';

export default {
  title: 'Inputs/CurrencyInput',
  component: CurrencyInput,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof CurrencyInput>;

const Template: StoryFn<typeof CurrencyInput> = () => {
  const [value1, setValue1] = React.useState(0);

  return (
    <Grid container spacing={5} flexDirection="column">
      <Grid>
        <Typography>CurrencyInput</Typography>
        <CurrencyInput defaultValue={value1} onChangeNumber={setValue1} />
        <Typography>Stored value: {value1}</Typography>
      </Grid>
      <Grid>
        <Typography>Disabled</Typography>
        <CurrencyInput
          defaultValue={value1}
          disabled
          onChangeNumber={() => {}}
        />
      </Grid>
    </Grid>
  );
};

export const Primary = Template.bind({});
