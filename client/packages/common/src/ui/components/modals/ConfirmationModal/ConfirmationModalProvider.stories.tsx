import React from 'react';
import { Story } from '@storybook/react';
import { BaseButton } from '../../buttons';
import { useConfirmationModal } from './ConfirmationModalProvider';

export default {
  title: 'Hooks/useConfirmationModal',
  component: useConfirmationModal,
};

const UseConfirmationModalStory: Story = () => {
  const getConfirmation = useConfirmationModal({
    title: 'Are you sure?',
    message: 'This will delete all your data.',
    onConfirm: () => alert('confirmed!'),
  });

  return <BaseButton onClick={() => getConfirmation()}>Open Modal</BaseButton>;
};

export const UseConfirmationModalHook = UseConfirmationModalStory.bind({});
