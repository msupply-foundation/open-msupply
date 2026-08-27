import React, { useEffect } from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { SearchBar } from './SearchBar';
import { Box } from '@mui/material';

export default {
  title: 'Inputs/SearchBar',
  component: SearchBar,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof SearchBar>;

const Template: StoryFn<typeof SearchBar> = () => {
  const [value, setValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (value) {
      setTimeout(() => {
        setIsLoading(false);
        alert('Response received!');
      }, 2000);
    }
  }, [value]);

  return (
    <Box>
      <SearchBar
        isLoading={isLoading}
        onChange={newValue => {
          setIsLoading(true);
          setValue(newValue);
          alert('Sending request now...');
        }}
        value={value}
        placeholder="Search..."
      />
    </Box>
  );
};

export const Primary = Template.bind({});
