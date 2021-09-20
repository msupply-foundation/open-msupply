import React from 'react';
import { useSortBy } from './useSortBy';
import { Story } from '@storybook/react';

export default {
  title: 'Hooks/useSortBy',
};

interface TestSortBy {
  id: string;
  quantity: number;
}

const Template: Story = () => {
  const { sortBy, onChangeSortBy } = useSortBy<TestSortBy>({
    key: 'id',
    isDesc: true,
  });

  return (
    <div>
      <div>
        <span> Two buttons to sort by two different keys, ID or Quantity.</span>
        <button onClick={() => onChangeSortBy({ key: 'id' })}>
          Sort by ID!
        </button>
        <button onClick={() => onChangeSortBy({ key: 'quantity' })}>
          Sort by Quantity!
        </button>
      </div>

      <p style={{ whiteSpace: 'pre' }}>{JSON.stringify(sortBy, null, 2)}</p>
    </div>
  );
};

export const Primary = Template.bind({});
