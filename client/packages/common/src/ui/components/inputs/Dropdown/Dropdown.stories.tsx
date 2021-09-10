import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { Dropdown, DropdownItem } from './Dropdown';

export default {
  title: 'Inputs/Dropdown',
  component: Dropdown,
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

const clickOptions = [
  { label: 'One', onClick: () => console.log('one') },
  { label: 'Two', onClick: () => console.log('two') },
  { label: 'Three', onClick: () => console.log('three') },
];

const Template: Story<{
  options: { label: string; value?: string; onClick?: () => void }[];
  placeholder: string;
}> = args => (
  <Dropdown label={args.placeholder}>
    {args.options.map(({ label, value, onClick }) => (
      <DropdownItem key={label} value={value} onClick={onClick}>
        {label}
      </DropdownItem>
    ))}
  </Dropdown>
);

export const Simple = Template.bind({});
Simple.args = {
  options: options.slice(0, 5),
  placeholder: 'Select a country!',
};

export const LargeList = Template.bind({});
LargeList.args = {
  options: options,
  placeholder: 'Select a country!',
};

export const OnClick = Template.bind({});
OnClick.args = {
  options: clickOptions,
  placeholder: 'Select a country!',
};
