import React from 'react';
import { Story } from '@storybook/react';
import { NameSearchModal } from './NameSearchModal';
import { useToggle } from '@common/hooks';
import { BaseButton } from '@common/components';

export default {
  title: 'Name/NameSearchModal',
  component: NameSearchModal,
};

const Template: Story = () => {
  const { isOn, toggleOn, toggleOff } = useToggle(true);

  return (
    <>
      <BaseButton onClick={toggleOn}>Open</BaseButton>
      <NameSearchModal
        open={isOn}
        onClose={toggleOff}
        onChange={async name => {
          toggleOn();
          alert(JSON.stringify(name, null, 2));
        }}
        type="customer"
      />
    </>
  );
};

export const Primary = Template.bind({});
