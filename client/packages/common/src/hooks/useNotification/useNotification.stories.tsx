import React from 'react';
import { StoryFn } from '@storybook/react';

import { useNotification } from './useNotification';
import { BaseButton } from '@common/components';

export default {
  title: 'Hooks/useNotification',
};

type Variant = 'error' | 'warning' | 'success' | 'info';

interface NotificationArgs {
  variant: Variant;
}

const NotificationButton: React.FC<NotificationArgs> = ({ variant }) => {
  const { error, warning, info, success } = useNotification();
  let onClick = () => {};

  switch (variant) {
    case 'error':
      onClick = error('Oh dear!');
      break;
    case 'warning':
      onClick = warning('Look out!!');
      break;
    case 'info':
      onClick = info('Turn left at the roundabout');
      break;
    default:
      onClick = success('Well done! 😁');
      break;
  }
  return <BaseButton onClick={onClick}>Click Me</BaseButton>;
};

const Template: StoryFn<NotificationArgs> = args => (
  <div>
    <NotificationButton {...args} />
  </div>
);

export const Error = Template.bind({});
export const Warning = Template.bind({});
export const Info = Template.bind({});
export const Success = Template.bind({});

Error.args = { variant: 'error' };
Warning.args = { variant: 'warning' };
Info.args = { variant: 'info' };
Success.args = { variant: 'success' };
