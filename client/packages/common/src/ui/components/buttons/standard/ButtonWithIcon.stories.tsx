import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { ButtonWithIcon } from './ButtonWithIcon';
import { BookIcon } from '../../../icons';

const Template: ComponentStory<typeof ButtonWithIcon> = () => (
  <Box>
    <ButtonWithIcon
      Icon={<BookIcon />}
      labelKey="button.docs"
      onClick={() => {
        alert('clicked');
      }}
    />
  </Box>
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/ButtonWithIcon',
  component: ButtonWithIcon,
} as ComponentMeta<typeof ButtonWithIcon>;
