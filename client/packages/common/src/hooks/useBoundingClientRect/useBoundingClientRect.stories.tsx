import React from 'react';
import { Story } from '@storybook/react';
import { useBoundingClientRectRef } from './useBoundingClientRect';

export default {
  title: 'Hooks/useBoundingClientRect',
};

const Template: Story = () => {
  const { ref, rect } = useBoundingClientRectRef<HTMLDivElement>();

  return (
    <div>
      <p ref={ref}>Change your browsers window dimensions!</p>
      <p>{JSON.stringify(rect, null, 2)}</p>
    </div>
  );
};

export const Primary = Template.bind({});
