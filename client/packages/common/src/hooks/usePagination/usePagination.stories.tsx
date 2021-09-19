import React from 'react';
import { usePagination } from './usePagination';
import { Story } from '@storybook/react';

export default {
  title: 'Hooks/usePagination',
};

const Template: Story = () => {
  const { first, offset, page, onChangePage, onChangeFirst } = usePagination();

  return (
    <div>
      <div>
        <span>change the page: </span>
        <input
          value={page}
          onChange={e => onChangePage(Number(e.target.value))}
          type="numeric"
        />
      </div>
      <div>
        <span>change the first/number of rows: </span>
        <input
          value={first}
          onChange={e => onChangeFirst(Number(e.target.value))}
          type="numeric"
        />
      </div>

      <p style={{ whiteSpace: 'pre-line' }}>
        {JSON.stringify({ first, offset, page })}
      </p>
    </div>
  );
};

export const Primary = Template.bind({});
