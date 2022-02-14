import React from 'react';
import { Box } from '@mui/material';
import { ComponentMeta } from '@storybook/react';
import { SplitButton } from './SplitButton';

const ops = [
  { label: 'Create a merge commit' },
  { label: 'Squash and merge' },
  { label: 'Rebase and merge' },
];

const Template = () => {
  return (
    <Box>
      <SplitButton
        ariaLabel="Split button"
        ariaControlLabel="open split button menu"
        options={ops}
        onClick={option => alert(JSON.stringify(option))}
      />
    </Box>
  );
};

export const Primary = Template.bind({});

export default {
  title: 'Buttons/SplitButton',
  component: SplitButton,
} as ComponentMeta<typeof SplitButton>;
