import React from 'react';
import { Story } from '@storybook/react';
import { ItemSearchInput } from './ItemSearchInput';
import { ItemRowWithStatsFragment } from '../../api';

export default {
  title: 'Item/ItemSearchInput',
  component: ItemSearchInput,
};

const Template: Story = () => {
  const [selectedItem, setSelectedItem] =
    React.useState<ItemRowWithStatsFragment | null>(null);

  return (
    <ItemSearchInput
      currentItemId={selectedItem?.id ?? undefined}
      onChange={item => {
        setSelectedItem(item);
      }}
    />
  );
};

export const Primary = Template.bind({});
