import React from 'react';
import { Grid } from '@mui/material';
import { StoryFn } from '@storybook/react';
import { ListSearch } from './ListSearch';
import { BaseButton } from '../../buttons';
import { useTranslation } from '@common/intl';

export default {
  title: 'Modals/ListSearch',
  component: ListSearch,
};

const options = Array.from({ length: 100 }).map((_, i) => ({
  name: `${i}`,
}));

const Template: StoryFn = () => {
  const [open, setOpen] = React.useState(false);
  const t = useTranslation('app');

  return (
    <Grid>
      <BaseButton onClick={() => setOpen(true)}> Open Modal </BaseButton>
      <ListSearch
        title={t('admin')}
        open={open}
        onClose={() => setOpen(false)}
        options={options}
        optionKey="name"
      />
    </Grid>
  );
};

export const Primary = Template.bind({});
