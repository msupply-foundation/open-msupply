import React from 'react';
import { Story } from '@storybook/react';
import { useWindowDimensions } from './useWindowDimensions';

export default {
  title: 'Hooks/useWindowDimensions',
};

const Template: Story = () => {
  const windowDimensions = useWindowDimensions();

  return (
    <div>
      <p>Change your browsers window dimensions!</p>
      <p>{JSON.stringify(windowDimensions, null, 2)}</p>
    </div>
  );
};

export const Primary = Template.bind({});
