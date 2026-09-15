import React from 'react';
import { StoryFn } from '@storybook/react';
import { BaseButton } from '../../buttons';
import { useConfirmationModal } from './useConfirmationModal';

export default {
  title: 'Hooks/useConfirmationModal',
  component: useConfirmationModal,
};

const UseConfirmationModalStory: StoryFn = () => {
  const getConfirmation = useConfirmationModal({
    title: 'Are you sure?',
    message: 'This will delete all your data.',
    onConfirm: () => alert('confirmed!'),
  });

  return <BaseButton onClick={() => getConfirmation()}>Open Modal</BaseButton>;
};

export const UseConfirmationModalHook = UseConfirmationModalStory.bind({});
