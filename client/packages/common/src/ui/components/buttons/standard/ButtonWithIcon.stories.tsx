import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { ButtonWithIcon } from './ButtonWithIcon';
import { BookIcon } from '../../../icons';
import { useTranslation } from '@common/intl';

const Template: ComponentStory<typeof ButtonWithIcon> = () => {
  const t = useTranslation('common');
  return (
    <Box>
      <ButtonWithIcon
        Icon={<BookIcon />}
        label={t('button.docs')}
        onClick={() => {
          alert('clicked');
        }}
      />
    </Box>
  );
};

export const Primary = Template.bind({});

export default {
  title: 'Buttons/ButtonWithIcon',
  component: ButtonWithIcon,
} as ComponentMeta<typeof ButtonWithIcon>;
