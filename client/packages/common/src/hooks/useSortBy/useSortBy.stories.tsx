import React from 'react';
import { useSortBy } from './useSortBy';
import { Story } from '@storybook/react';

import { BaseButton } from '@common/components';

export default {
  title: 'Hooks/useSortBy',
};

interface TestSortBy {
  id: string;
  quantity: number;
}

const Template: Story = () => {
  const { sortBy, onChangeSortBy } = useSortBy<TestSortBy>({ key: 'id' });

  return (
    <div>
      <div>
        <span> Two buttons to sort by two different keys, ID or Quantity.</span>
        <BaseButton onClick={() => onChangeSortBy({ key: 'id' })}>
          Sort by ID!
        </BaseButton>
        <BaseButton onClick={() => onChangeSortBy({ key: 'quantity' })}>
          Sort by Quantity!
        </BaseButton>
      </div>

      <p style={{ whiteSpace: 'pre' }}>{JSON.stringify(sortBy, null, 2)}</p>
    </div>
  );
};

export const Primary = Template.bind({});
