import React from 'react';
import { StoryFn } from '@storybook/react';
import { useBoundingClientRectRef } from './useBoundingClientRect';

export default {
  title: 'Hooks/useBoundingClientRect',
};

const Template: StoryFn = () => {
  const { ref, rect } = useBoundingClientRectRef<HTMLDivElement>();

  return (
    <div>
      <p ref={ref}>Change your browsers window dimensions!</p>
      <p style={{ whiteSpace: 'pre' }}>{JSON.stringify(rect, null, 2)}</p>
    </div>
  );
};

export const Primary = Template.bind({});
