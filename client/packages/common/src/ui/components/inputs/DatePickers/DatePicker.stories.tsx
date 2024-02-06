import React from 'react';
import { StoryFn } from '@storybook/react';
import { Box, Typography } from '@mui/material';
import { DateTimePickerInput } from './DateTimePickerInput';
import { ExpiryDateInput } from './ExpiryDateInput';

export default {
  title: 'Pickers/DateTimePicker',
  component: DateTimePickerInput,
};

const Template: StoryFn = () => {
  const [value, setValue] = React.useState<Date | null>(null);
  return (
    <Box m={4} gap={4} flex={1} display="flex">
      <Box>
        <Typography>Date input</Typography>
        <DateTimePickerInput
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

      <Box>
        <Typography>Date and time input</Typography>
        <DateTimePickerInput
          value={value}
          showTime={true}
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
