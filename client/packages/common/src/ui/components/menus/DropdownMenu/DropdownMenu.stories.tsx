import React from 'react';
import { SvgIconProps } from '@mui/material';
import { Meta, StoryFn } from '@storybook/react';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';
import {
  CustomersIcon,
  DownloadIcon,
  SuppliersIcon,
  ToolsIcon,
} from '@common/icons';

export default {
  title: 'Menus/DropdownMenu',
  component: DropdownMenu,
} as Meta<typeof DropdownMenu>;

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
  { label: 'One', onClick: () => console.info('one') },
  { label: 'Two', onClick: () => console.info('two') },
  { label: 'Three', onClick: () => console.info('three') },
];

const iconOptions = [
  { label: 'Customers', icon: CustomersIcon },
  { label: 'Suppliers', icon: SuppliersIcon },
  { label: 'Download', icon: DownloadIcon },
  { label: 'Tools', icon: ToolsIcon },
];

const someWithIconsOptions = [
  { label: 'Customers', icon: CustomersIcon },
  { label: 'Suppliers', inset: true },
  { label: 'Download', icon: DownloadIcon },
  { label: 'Tools', inset: true },
];

const Template: StoryFn<{
  options: {
    label: string;
    value?: string;
    onClick?: () => void;
    icon?: React.JSXElementConstructor<SvgIconProps>;
    inset?: boolean;
  }[];
  placeholder: string;
}> = args => (
  <DropdownMenu label={args.placeholder}>
    {args.options.map(({ label, value, onClick, icon, inset }) => (
      <DropdownMenuItem
        key={label}
        value={value}
        onClick={onClick}
        IconComponent={icon}
        inset={inset}
      >
        {label}
      </DropdownMenuItem>
    ))}
  </DropdownMenu>
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

export const WithIcons = Template.bind({});
WithIcons.args = {
  options: iconOptions,
  placeholder: 'Select a .. thing!',
};

export const SomeWithIcons = Template.bind({});
SomeWithIcons.args = {
  options: someWithIconsOptions,
  placeholder: 'Select again!',
};
