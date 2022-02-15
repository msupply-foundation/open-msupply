import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { ComponentMeta } from '@storybook/react';
import { SplitButton, SplitButtonOption } from './SplitButton';
import { useI18N } from '@common/intl';

const ops: [
  SplitButtonOption<string>,
  SplitButtonOption<string>,
  SplitButtonOption<string>
] = [
  { label: 'Create a merge commit', value: 'createAndMerge' },
  { label: 'Squash and merge', value: 'squashAndMerge' },
  { label: 'Rebase and merge', value: 'rebaseAndMerge' },
];

const BasicComponent = () => {
  const [selectedOption, setSelectedOption] = useState<
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

const IsDisabledComponent = () => {
  ops[1].isDisabled = true;
  const [selectedOption, setSelectedOption] = useState<
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

const RTLComponent = () => {
  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(ops[0]);
  const i18n = useI18N();

  useEffect(() => {
    i18n.changeLanguage('ar');
  }, [i18n]);

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

export const Basic = BasicComponent.bind({});
export const IsDisabled = IsDisabledComponent.bind({});
export const RTL = RTLComponent.bind({});

export default {
  title: 'Buttons/SplitButton',
  component: SplitButton,
} as ComponentMeta<typeof SplitButton>;
