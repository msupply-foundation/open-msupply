import React from 'react';
import { Story } from '@storybook/react';
import { NameSearchInput } from './NameSearchInput';
import { NameRowFragment } from '../../api';

export default {
  title: 'Name/NameSearchInput',
  component: NameSearchInput,
};

const Template: Story = () => {
  const [selectedName, setSelectedName] =
    React.useState<NameRowFragment | null>(null);

  return (
    <NameSearchInput
      disabled={false}
      value={selectedName}
      onChange={name => {
        setSelectedName(name);
      }}
      type="customer"
    />
  );
};

export const Primary = Template.bind({});
