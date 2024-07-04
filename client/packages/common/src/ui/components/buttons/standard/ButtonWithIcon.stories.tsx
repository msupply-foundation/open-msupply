import React from 'react';
import { Box } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { ButtonWithIcon } from './ButtonWithIcon';
import { BookIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

const Template: StoryFn<typeof ButtonWithIcon> = () => {
  const t = useTranslation('app');
  return (
    <Box>
      <ButtonWithIcon
        Icon={<BookIcon />}
        label={t('docs')}
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
} as Meta<typeof ButtonWithIcon>;
