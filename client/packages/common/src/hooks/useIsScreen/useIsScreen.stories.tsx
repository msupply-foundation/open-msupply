import React from 'react';
import { StoryFn } from '@storybook/react';
import { StoryProvider } from '../../utils';
import { useIsSmallScreen } from './useIsSmallScreen';
import { useIsMediumScreen } from './useIsMediumScreen';
import { useIsLargeScreen } from './useIsLargeScreen';
import { useIsExtraLargeScreen } from './useIsExtraLargeScreen';

const Template: StoryFn<{
  type: 'large' | 'medium' | 'xl' | 'sm';
  hook: () => boolean;
}> = args => {
  const isScreen = args.hook();

  return (
    <StoryProvider>
      <div>
        <p>Adjust your viewport to see when the hook is triggered</p>
        <p>{`Is a ${args.type} screen: ${String(isScreen)}`}</p>
      </div>
    </StoryProvider>
  );
};

export const IsExtraLargeScreen = Template.bind({});
IsExtraLargeScreen.args = { hook: useIsExtraLargeScreen, type: 'xl' };

export const IsLargeScreen = Template.bind({});
IsLargeScreen.args = { hook: useIsLargeScreen, type: 'large' };

export const IsMediumScreen = Template.bind({});
IsMediumScreen.args = { hook: useIsMediumScreen, type: 'medium' };

export const IsSmallScreen = Template.bind({});
IsSmallScreen.args = { hook: useIsSmallScreen, type: 'sm' };

export default {
  title: 'Hooks/useIsScreen',
};
