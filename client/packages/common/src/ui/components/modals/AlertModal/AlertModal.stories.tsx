import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { useToggle } from '@common/hooks';
import { AlertModal } from './AlertModal';
import { Button } from '@mui/material';

export default {
  title: 'Modals/AlertModal',
  component: AlertModal,
} as ComponentMeta<typeof AlertModal>;

const Template: ComponentStory<typeof AlertModal> = () => {
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
