import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { SearchBar } from './SearchBar';
import { Box } from '@mui/material';

export default {
  title: 'Inputs/SearchBar',
  component: SearchBar,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof SearchBar>;

const Template: ComponentStory<typeof SearchBar> = () => {
  const [value, setValue] = React.useState('');

  return (
    <Box>
      <SearchBar
        onChange={newValue => {
          alert(newValue);
          setValue(newValue);
        }}
        value={value}
        placeholder="Search..."
      />
    </Box>
  );
};

export const Primary = Template.bind({});
