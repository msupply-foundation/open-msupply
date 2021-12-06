import React from 'react';
import { Story } from '@storybook/react';
import { Box, Typography } from '@mui/material';
import { DatePickerInput } from './DatePickerInput';
import { ExpiryDateInput } from './ExpiryDateInput';

export default {
  title: 'Pickers/DatePicker',
  component: DatePickerInput,
};

const Template: Story = () => {
  const [value, setValue] = React.useState<Date | null>(null);
  return (
    <Box m={4} gap={4} flex={1} display="flex">
      <Box>
        <Typography>Standard input</Typography>
        <DatePickerInput
          value={value}
          onChange={newValue => {
            setValue(newValue);
          }}
        />
      </Box>

      <Box>
        <Typography>Expiry date input</Typography>
        <ExpiryDateInput
          value={value}
          onChange={newValue => {
            setValue(newValue);
          }}
        />
      </Box>
    </Box>
  );
};

export const Primary = Template.bind({});
Primary.args = {};
