import React from 'react';
import { Box } from '@mui/material';
import { ComponentMeta } from '@storybook/react';
import { SplitButton, SplitButtonOption } from './SplitButton';

const ops: [
  SplitButtonOption<string>,
  SplitButtonOption<string>,
  SplitButtonOption<string>
] = [
  { label: 'Create a merge commit', value: 'createAndMerge' },
  { label: 'Squash and merge', value: 'squashAndMerge' },
  { label: 'Rebase and merge', value: 'rebaseAndMerge' },
];

const Template = () => {
  const [selectedOption, setSelectedOption] = React.useState<
    SplitButtonOption<string>
  >(ops[0]);

  return (
    <Box>
      <SplitButton
        ariaLabel="Split button"
        ariaControlLabel="open split button menu"
        options={ops}
        onClick={option => alert(JSON.stringify(option))}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
      />
    </Box>
  );
};

export const Primary = Template.bind({});

export default {
  title: 'Buttons/SplitButton',
  component: SplitButton,
} as ComponentMeta<typeof SplitButton>;
