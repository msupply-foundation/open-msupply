import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { CurrencyInput } from './CurrencyInput';
import { Box, Typography } from '@mui/material';

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
    <Box>
      <CurrencyInput defaultValue={value1} onChangeNumber={setValue1} />
      <Typography>Stored value: {value1}</Typography>
    </Box>
  );
};

export const Primary = Template.bind({});
