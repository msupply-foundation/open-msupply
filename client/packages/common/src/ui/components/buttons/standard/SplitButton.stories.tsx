import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { Meta } from '@storybook/react';
import { SplitButton, SplitButtonOption } from './SplitButton';
import { useIntlUtils } from '@common/intl';

const getOptions = (): [
  SplitButtonOption<string>,
  SplitButtonOption<string>,
  SplitButtonOption<string>
] => [
  { label: 'Create a merge commit', value: 'createAndMerge' },
  { label: 'Squash and merge', value: 'squashAndMerge' },
  { label: 'Rebase and merge', value: 'rebaseAndMerge' },
];

const BasicComponent = () => {
  const options = getOptions();
  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  return (
    <Box>
      <SplitButton
        ariaLabel="Split button"
        ariaControlLabel="open split button menu"
        options={options}
        onClick={option => alert(JSON.stringify(option))}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
      />
    </Box>
  );
};

const IsDisabledComponent = () => {
  const options = getOptions();

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  return (
    <Box>
      <SplitButton
        isDisabled
        ariaLabel="Split button"
        ariaControlLabel="open split button menu"
        options={options}
        onClick={option => alert(JSON.stringify(option))}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
      />
    </Box>
  );
};

const OptionDisabledComponent = () => {
  const options = getOptions();
  options[1].isDisabled = true;
  options[2].isDisabled = true;
  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  return (
    <Box>
      <SplitButton
        ariaLabel="Split button"
        ariaControlLabel="open split button menu"
        options={options}
        onClick={option => alert(JSON.stringify(option))}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
      />
    </Box>
  );
};

const RTLComponent = () => {
  const options = getOptions();
  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);
  const { changeLanguage } = useIntlUtils();

  useEffect(() => {
    changeLanguage('ar');
  }, [changeLanguage]);

  return (
    <Box>
      <SplitButton
        ariaLabel="Split button"
        ariaControlLabel="open split button menu"
        options={options}
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
export const OptionDisabled = OptionDisabledComponent.bind({});

export default {
  title: 'Buttons/SplitButton',
  component: SplitButton,
} as Meta<typeof SplitButton>;
