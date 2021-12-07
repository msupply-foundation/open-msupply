import React from 'react';
import { Story } from '@storybook/react';
import { ItemSearchInput } from './ItemSearchInput';
import { Item } from '@openmsupply-client/common';

export default {
  title: 'Item/ItemSearchInput',
  component: ItemSearchInput,
};

const Template: Story = () => {
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);

  return (
    <ItemSearchInput
      currentItem={selectedItem ?? undefined}
      onChange={item => {
        setSelectedItem(item);
      }}
    />
  );
};

export const Primary = Template.bind({});
