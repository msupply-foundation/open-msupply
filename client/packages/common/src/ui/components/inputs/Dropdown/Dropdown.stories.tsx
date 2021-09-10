import React from 'react';
import { ComponentStory, ComponentMeta, Story } from '@storybook/react';

import { Dropdown, DropdownItem } from './Dropdown';
import { Box, styled } from '@material-ui/system';

export default {
  title: 'Inputs/Dropdown',
  component: Dropdown,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof Dropdown>;

const options = [
  { value: 'cooks', label: 'Cook islands.' },
  { value: 'tonga', label: 'Tonga' },
  { value: 'tokelau', label: 'Tokelau' },
  { value: 'marshallIsland', label: 'Marshall Island' },
  { value: 'micronesia', label: 'Micronesia' },
  { value: 'nauru', label: 'Nauru' },
  { value: 'kiribati', label: 'Kiribati' },
  { value: 'png', label: 'Papa New Guinea' },
  { value: 'solomons', label: 'Solomon Islands' },
  { value: 'vanuatu', label: 'Vanuatu' },
  { value: 'eastTimor', label: 'East Timor' },
  { value: 'cambodia', label: 'Cambodia' },
  { value: 'fiji', label: 'Fiji' },
  { value: 'laos', label: 'Laos' },
  { value: 'india', label: 'India' },
  { value: 'myanmar', label: 'Myanmar' },
  { value: 'afghanistan', label: 'Afghanistan' },
  { value: 'nepal', label: 'Nepal' },
  { value: 'southSudan', label: 'South Sudan' },
  { value: 'uganda', label: 'Uganda' },
  { value: 'tanzania', label: 'Tanzania' },
  { value: 'zambia', label: 'Zambia' },
  { value: 'cdi', label: "Cote d'Ivoire" },
  { value: 'nigeria', label: 'Nigeria' },
  { value: 'ghana', label: 'Ghana' },
  { value: 'drCongo', label: 'Democratic Republic of the Congo' },
  { value: 'liberia', label: 'Liberia' },
  { value: 'sierraLeone', label: 'Sierra Leone' },
  { value: 'gambia', label: 'Gambia' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'usa', label: 'United States of America' },
];

const Container = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
});

const Template: Story<{
  options: { label: string; value: string }[];
  placeholder: string;
}> = args => (
  <Container>
    <Dropdown label={args.placeholder} value="">
      {args.options.map(({ label, value }) => (
        <DropdownItem key={label} value={value}>
          {label}
        </DropdownItem>
      ))}
    </Dropdown>
  </Container>
);

export const Primary = Template.bind({});
Primary.args = {
  options: options.slice(0, 5),
  placeholder: 'Select a country!',
};
