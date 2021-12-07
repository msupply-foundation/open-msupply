import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Widget } from './Widget';
import { Typography } from '@mui/material';
import { useTranslation } from '@common/intl';

const Template: ComponentStory<typeof Widget> = () => {
  const t = useTranslation('app');

  return (
    <Widget title={t('stock')}>
      <Typography>[ This is a dashboard widget with nothing in it ]</Typography>
    </Widget>
  );
};

export const Primary = Template.bind({});

export default {
  title: 'Components/Widget',
  component: Widget,
} as ComponentMeta<typeof Widget>;
