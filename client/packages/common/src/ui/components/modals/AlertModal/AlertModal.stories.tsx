import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { useToggle } from '@common/hooks';
import { AlertModal } from './AlertModal';
import { Button } from '@mui/material';

export default {
  title: 'Modals/AlertModal',
  component: AlertModal,
} as Meta<typeof AlertModal>;

const Template: StoryFn<typeof AlertModal> = () => {
  const { isOn, toggle } = useToggle();
  return (
    <>
      <Button onClick={toggle}>Alert me!</Button>
      <AlertModal
        open={isOn}
        title="A sample alert modal"
        message="Some text can be shown here..."
        onOk={() => {
          console.info('oh, ok');
          toggle();
        }}
      />
    </>
  );
};

export const Primary = Template.bind({});
