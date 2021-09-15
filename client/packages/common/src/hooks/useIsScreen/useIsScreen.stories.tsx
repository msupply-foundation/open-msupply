import React from 'react';
import { Story } from '@storybook/react';
import { useIsLargeScreen } from './useIsLargeScreen';
import { TestingProvider } from '../../utils';
import { useIsMediumScreen } from '.';
import { useIsExtraLargeScreen } from './useIsExtraLargeScreen';
import { useIsSmallScreen } from '../..';

const Template: Story<{
  type: 'large' | 'medium' | 'xl' | 'sm';
  hook: () => boolean;
}> = args => {
  const isScreen = args.hook();

  return (
    <TestingProvider>
      <div>
        <p>Adjust your viewport to see when the hook is triggered</p>
        <p>{`Is a ${args.type} screen: ${String(isScreen)}`}</p>
      </div>
    </TestingProvider>
  );
};

export const IsMediumScreen = Template.bind({});
IsMediumScreen.args = { hook: useIsMediumScreen, type: 'medium' };

export const IsLargeScreen = Template.bind({});
IsLargeScreen.args = { hook: useIsLargeScreen, type: 'large' };

export const IsExtraLargeScreen = Template.bind({});
IsExtraLargeScreen.args = { hook: useIsExtraLargeScreen, type: 'xl' };

export const IsSmallScreen = Template.bind({});
IsSmallScreen.args = { hook: useIsSmallScreen, type: 'sm' };

export default {
  title: 'Hooks/useIsScreen',
};
