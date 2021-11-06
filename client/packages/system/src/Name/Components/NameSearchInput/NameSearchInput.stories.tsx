import React from 'react';
import { Story } from '@storybook/react';
import { NameSearchInput } from './NameSearchInput';
import { Name } from '@openmsupply-client/common';

export default {
  title: 'Name/NameSearchInput',
  component: NameSearchInput,
};

const Template: Story = () => {
  const [selectedName, setSelectedName] = React.useState<Name | null>(null);

  return (
    <NameSearchInput
      disabled={false}
      value={selectedName}
      onChange={name => {
        setSelectedName(name);
      }}
    />
  );
};

export const Primary = Template.bind({});
