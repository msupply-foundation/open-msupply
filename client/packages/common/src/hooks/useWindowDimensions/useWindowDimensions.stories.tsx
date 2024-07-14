import React from 'react';
import { StoryFn } from '@storybook/react';
import { useWindowDimensions } from './useWindowDimensions';

export default {
  title: 'Hooks/useWindowDimensions',
};

const Template: StoryFn = () => {
  const windowDimensions = useWindowDimensions();

  return (
    <div>
      <p>Change your browsers window dimensions!</p>
      <p style={{ whiteSpace: 'pre' }}>
        {JSON.stringify(windowDimensions, null, 2)}
      </p>
    </div>
  );
};

export const Primary = Template.bind({});
